import { Response, NextFunction } from "express";
import Mentor from "../models/Mentor.model";
import User from "../models/User.model";
import Session from "../models/Session.model";
import Review from "../models/Review.model";
import Notification from "../models/Notification.model";
import BadgeRequest, { BadgeTier } from "../models/BadgeRequest.model";
import { AuthRequest } from "../middlewares/auth.middleware";
import { createError } from "../middlewares/errorHandler";
import { sendEmail } from "../utils/email";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "karigarcareers@gmail.com";

export const BADGE_RULES = {
  silver: { threshold: 30, fee: 5000 },
  gold: { threshold: 50, fee: 10000 },
};

const rank = (b: string): number => (b === "gold" ? 2 : b === "silver" ? 1 : 0);

// ── Eligibility check (called after a session is completed) ─────
// If the mentor has crossed a threshold and doesn't already hold/await that
// badge, create a pending eligibility request and notify the admin.
export const checkBadgeEligibility = async (mentorUserId: string): Promise<void> => {
  try {
    const mentor = await Mentor.findOne({ userId: mentorUserId }).populate("userId", "name email");
    if (!mentor) return;
    const completed = mentor.sessionsCount || 0;

    let target: BadgeTier | null = null;
    if (completed >= BADGE_RULES.gold.threshold && mentor.badge !== "gold") target = "gold";
    else if (completed >= BADGE_RULES.silver.threshold && mentor.badge === "none") target = "silver";
    if (!target) return;

    // Skip if there's already a pending request for this (or a better) tier.
    const existing = await BadgeRequest.findOne({
      mentorId: mentorUserId,
      status: "pending",
      badge: target,
    });
    if (existing) return;

    await BadgeRequest.create({
      mentorId: mentorUserId,
      badge: target,
      source: "eligibility",
      status: "pending",
      completedSessions: completed,
    });

    const u = mentor.userId as unknown as { name: string; email: string };
    const admin = await User.findOne({ role: "admin" });
    if (admin) {
      await Notification.create({
        userId: admin._id,
        title: "Mentor eligible for a badge",
        message: `${u?.name || "A mentor"} has completed ${completed} sessions and is eligible for the ${target} badge. Review to approve.`,
        type: "booking_created",
      });
    }
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `Mentor eligible for ${target} badge — Karigar`,
      template: "badgeEligibleAdmin",
      data: { mentorName: u?.name || "A mentor", badge: target, completed },
    }).catch(() => {});
  } catch (err) {
    console.error("[badge] eligibility check failed:", (err as Error).message);
  }
};

// ── Mentor: current badge status + eligibility ─────────────────
export const getMyBadge = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const mentor = await Mentor.findOne({ userId: req.user!.id });
    if (!mentor) throw createError("Mentor profile not found.", 404);
    const pending = await BadgeRequest.findOne({ mentorId: req.user!.id, status: "pending" }).sort({ createdAt: -1 });
    const completed = mentor.sessionsCount || 0;

    res.json({
      success: true,
      data: {
        badge: mentor.badge,
        completedSessions: completed,
        pendingRequest: pending ? { id: pending._id, badge: pending.badge, source: pending.source, createdAt: pending.createdAt } : null,
        eligibility: {
          silver: completed >= BADGE_RULES.silver.threshold && mentor.badge === "none",
          gold: completed >= BADGE_RULES.gold.threshold && mentor.badge !== "gold",
        },
        rules: BADGE_RULES,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── Mentor: apply (paid) for a badge ───────────────────────────
export const applyForBadge = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { badge, receipt } = req.body as { badge: BadgeTier; receipt?: string };
    if (badge !== "silver" && badge !== "gold") throw createError("Choose a valid badge (silver or gold).", 400);
    if (!receipt || typeof receipt !== "string" || !receipt.startsWith("data:")) {
      throw createError("Please upload your payment receipt for the badge fee.", 400);
    }

    const mentor = await Mentor.findOne({ userId: req.user!.id }).populate("userId", "name email");
    if (!mentor) throw createError("Mentor profile not found.", 404);

    if (rank(mentor.badge) >= rank(badge)) {
      throw createError(`You already hold the ${mentor.badge} badge.`, 400);
    }
    const pending = await BadgeRequest.findOne({ mentorId: req.user!.id, status: "pending" });
    if (pending) throw createError("You already have a badge request under review.", 409);

    const request = await BadgeRequest.create({
      mentorId: req.user!.id,
      badge,
      source: "application",
      status: "pending",
      fee: BADGE_RULES[badge].fee,
      receiptImage: receipt,
      completedSessions: mentor.sessionsCount || 0,
    });

    const u = mentor.userId as unknown as { name: string; email: string };
    const admin = await User.findOne({ role: "admin" });
    if (admin) {
      await Notification.create({
        userId: admin._id,
        title: "Badge application received",
        message: `${u?.name || "A mentor"} applied (paid) for the ${badge} badge. Verify the payment and review.`,
        type: "payment_approved",
      });
    }
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `Badge application (${badge}) — verify payment — Karigar`,
      template: "badgeApplicationAdmin",
      data: { mentorName: u?.name || "A mentor", badge, fee: BADGE_RULES[badge].fee },
    }).catch(() => {});

    res.status(201).json({ success: true, data: { id: request._id, badge: request.badge, status: request.status } });
  } catch (error) {
    next(error);
  }
};

interface PopulatedRef {
  _id: string;
  name: string;
  email: string;
}

// ── Admin: list badge requests (with mentor stats) ─────────────
export const listBadgeRequests = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status = "pending" } = req.query;
    const filter = status === "all" ? {} : { status: String(status) };
    const requests = await BadgeRequest.find(filter).populate("mentorId", "name email").sort({ createdAt: -1 });

    const enriched = await Promise.all(
      requests.map(async (r) => {
        const u = r.mentorId as unknown as PopulatedRef;
        const mentorProfile = await Mentor.findOne({ userId: u._id }).select("_id badge rating");
        const [completed, rejected, cancelled, total, reviewsCount] = await Promise.all([
          Session.countDocuments({ mentorId: u._id, status: "COMPLETED" }),
          Session.countDocuments({ mentorId: u._id, status: "REJECTED" }),
          Session.countDocuments({ mentorId: u._id, status: "CANCELLED" }),
          Session.countDocuments({ mentorId: u._id }),
          Review.countDocuments({ mentorId: u._id }),
        ]);
        // Everything not finalised (awaiting payment/admin/mentor, approved, or
        // mid-reschedule). Guarantees completed + rejected + cancelled + pending = total.
        const pending = Math.max(0, total - completed - rejected - cancelled);
        return {
          id: r._id,
          badge: r.badge,
          source: r.source,
          status: r.status,
          fee: r.fee,
          hasReceipt: r.source === "application",
          createdAt: r.createdAt,
          declineReason: r.declineReason,
          mentor: {
            userId: u._id,
            profileId: mentorProfile?._id,
            name: u.name,
            email: u.email,
            currentBadge: mentorProfile?.badge || "none",
            rating: mentorProfile?.rating || 0,
            completed,
            rejected,
            cancelled,
            pending,
            total,
            reviewsCount,
          },
        };
      })
    );

    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
};

// ── Admin: fetch a badge application receipt (on demand) ───────
export const getBadgeReceipt = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const request = await BadgeRequest.findById(req.params.requestId).select("receiptImage");
    if (!request) throw createError("Badge request not found.", 404);
    res.json({ success: true, data: { receiptImage: request.receiptImage || null } });
  } catch (error) {
    next(error);
  }
};

// ── Admin: approve a badge request ─────────────────────────────
export const approveBadgeRequest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const request = await BadgeRequest.findById(req.params.requestId).populate("mentorId", "name email");
    if (!request) throw createError("Badge request not found.", 404);
    if (request.status !== "pending") throw createError("This request has already been reviewed.", 400);

    request.status = "approved";
    request.reviewedBy = req.user!.id as unknown as typeof request.reviewedBy;
    request.reviewedAt = new Date();
    await request.save();

    await Mentor.findOneAndUpdate({ userId: request.mentorId }, { badge: request.badge });

    const u = request.mentorId as unknown as PopulatedRef;
    await Notification.create({
      userId: u._id,
      title: "Badge Awarded! 🏅",
      message: `Congratulations! You've been awarded the ${request.badge} badge.`,
      type: "session_approved",
    });
    await sendEmail({
      to: u.email,
      subject: `You've earned the ${request.badge} badge — Karigar`,
      template: "badgeApproved",
      data: { name: u.name, badge: request.badge },
    }).catch(() => {});

    res.json({ success: true, data: { id: request._id, status: request.status, badge: request.badge } });
  } catch (error) {
    next(error);
  }
};

// ── Admin: decline a badge request (reason required) ───────────
export const declineBadgeRequest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { reason } = req.body;
    if (!reason || !String(reason).trim()) throw createError("A reason is required to decline a badge request.", 400);

    const request = await BadgeRequest.findById(req.params.requestId).populate("mentorId", "name email");
    if (!request) throw createError("Badge request not found.", 404);
    if (request.status !== "pending") throw createError("This request has already been reviewed.", 400);

    request.status = "declined";
    request.declineReason = String(reason).trim();
    request.reviewedBy = req.user!.id as unknown as typeof request.reviewedBy;
    request.reviewedAt = new Date();
    await request.save();

    const u = request.mentorId as unknown as PopulatedRef;
    await Notification.create({
      userId: u._id,
      title: "Badge Request Declined",
      message: `Your ${request.badge} badge request was declined. Reason: ${request.declineReason}`,
      type: "session_rejected",
    });
    await sendEmail({
      to: u.email,
      subject: `Badge request update — Karigar`,
      template: "badgeDeclined",
      data: { name: u.name, badge: request.badge, reason: request.declineReason },
    }).catch(() => {});

    res.json({ success: true, data: { id: request._id, status: request.status } });
  } catch (error) {
    next(error);
  }
};

// ── Admin: directly grant / revoke a badge (by mentor profile id) ──
export const grantBadge = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { badge } = req.body as { badge: "none" | BadgeTier };
    if (!["none", "silver", "gold"].includes(badge)) throw createError("Invalid badge.", 400);

    const mentor = await Mentor.findById(req.params.mentorId).populate("userId", "name email");
    if (!mentor) throw createError("Mentor not found.", 404);

    mentor.badge = badge;
    await mentor.save();

    const u = mentor.userId as unknown as PopulatedRef;
    if (badge === "none") {
      await Notification.create({ userId: u._id, title: "Badge Removed", message: "Your badge has been removed by the admin.", type: "session_rejected" });
    } else {
      await BadgeRequest.create({ mentorId: u._id, badge, source: "admin", status: "approved", reviewedBy: req.user!.id, reviewedAt: new Date() });
      await Notification.create({ userId: u._id, title: "Badge Awarded! 🏅", message: `The admin has awarded you the ${badge} badge.`, type: "session_approved" });
      await sendEmail({ to: u.email, subject: `You've earned the ${badge} badge — Karigar`, template: "badgeApproved", data: { name: u.name, badge } }).catch(() => {});
    }

    res.json({ success: true, data: { mentorId: mentor._id, badge: mentor.badge } });
  } catch (error) {
    next(error);
  }
};
