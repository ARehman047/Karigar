import { Router, Response, NextFunction } from "express";
import { authenticate, authorize, AuthRequest } from "../middlewares/auth.middleware";
import User from "../models/User.model";
import Mentor from "../models/Mentor.model";
import Student from "../models/Student.model";
import Session from "../models/Session.model";
import Payment from "../models/Payment.model";
import Review from "../models/Review.model";
import Notification from "../models/Notification.model";
import { createError } from "../middlewares/errorHandler";
import { sendEmail } from "../utils/email";

const router = Router();
router.use(authenticate, authorize("admin"));

// ── Dashboard stats ────────────────────────────────────────────
router.get("/stats", async (_req, res: Response, next: NextFunction) => {
  try {
    const [
      totalStudents,
      totalMentors,
      totalSessions,
      upcomingSessions,
      completedSessions,
      pendingPayments,
      pendingMentorApprovals,
      pendingStudentApprovals,
      successfulPayments,
    ] = await Promise.all([
      User.countDocuments({ role: "student" }),
      Mentor.countDocuments({ isApproved: true }),
      Session.countDocuments(),
      Session.countDocuments({ status: "APPROVED" }),
      Session.countDocuments({ status: "COMPLETED" }),
      Payment.countDocuments({ status: "PENDING" }),
      User.countDocuments({ role: "mentor", status: "pending" }),
      User.countDocuments({ role: "student", status: "pending" }),
      Payment.find({ status: "SUCCESS" }).select("amount"),
    ]);

    const totalRevenue = successfulPayments.reduce((sum, p) => sum + p.amount, 0);

    res.json({
      success: true,
      data: {
        totalStudents,
        totalMentors,
        totalSessions,
        upcomingSessions,
        completedSessions,
        pendingPayments,
        totalRevenue,
        pendingMentorApprovals,
        pendingStudentApprovals,
        pendingApprovals: pendingMentorApprovals + pendingStudentApprovals,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ── List all users (with role-specific profile) ────────────────
router.get("/users", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { role, status } = req.query;
    const filter: Record<string, unknown> = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    const users = await User.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
});

// ── List students ──────────────────────────────────────────────
router.get("/students", async (_req, res: Response, next: NextFunction) => {
  try {
    const students = await Student.find().populate("userId", "name email status createdAt profilePicture").sort({ createdAt: -1 });
    res.json({ success: true, data: students });
  } catch (error) {
    next(error);
  }
});

// ── List mentors (all, including pending) ──────────────────────
router.get("/mentors", async (_req, res: Response, next: NextFunction) => {
  try {
    const mentors = await Mentor.find().populate("userId", "name email status createdAt profilePicture").sort({ createdAt: -1 });
    res.json({ success: true, data: mentors });
  } catch (error) {
    next(error);
  }
});

// ── Get a mentor's uploaded certificate files (for review) ─────
router.get("/mentors/:mentorId/certificates", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const mentor = await Mentor.findById(req.params.mentorId).select("+certificateFiles");
    if (!mentor) throw createError("Mentor not found.", 404);
    res.json({ success: true, data: mentor.certificateFiles || [] });
  } catch (error) {
    next(error);
  }
});

// ── List sessions ──────────────────────────────────────────────
router.get("/sessions", async (_req, res: Response, next: NextFunction) => {
  try {
    const sessions = await Session.find()
      .populate("studentId", "name email")
      .populate("mentorId", "name email")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: sessions });
  } catch (error) {
    next(error);
  }
});

// ── List payments ──────────────────────────────────────────────
router.get("/payments", async (_req, res: Response, next: NextFunction) => {
  try {
    const payments = await Payment.find()
      .select("-receiptImage") // exclude heavy base64 from the list; fetched on demand
      .populate("studentId", "name email")
      .populate("mentorId", "name email")
      .populate("sessionId", "topic date time packageName type")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: payments });
  } catch (error) {
    next(error);
  }
});

// ── List pending accounts (awaiting approval) ──────────────────
router.get("/pending", async (_req, res: Response, next: NextFunction) => {
  try {
    const pendingUsers = await User.find({ status: "pending" }).sort({ createdAt: -1 });
    res.json({ success: true, data: pendingUsers });
  } catch (error) {
    next(error);
  }
});

// ── Approve an account (student or mentor) by userId ───────────
router.put("/users/:userId/approve", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) throw createError("User not found.", 404);

    user.status = "active";
    await user.save();

    if (user.role === "mentor") {
      await Mentor.findOneAndUpdate({ userId: user._id }, { isApproved: true });
    }

    await Notification.create({
      userId: user._id,
      title: "Account Approved!",
      message:
        user.role === "mentor"
          ? "Your mentor account has been approved. You can now sign in and start receiving bookings."
          : "Your account has been approved. You can now sign in and start booking sessions.",
      type: "mentor_approved",
    });

    await sendEmail({
      to: user.email,
      subject: "Your Karigar account has been approved!",
      template: "accountApproved",
      data: { name: user.name, role: user.role },
    }).catch(() => {});

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// ── Reject an account by userId (removes the pending account) ──
router.put("/users/:userId/reject", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) throw createError("User not found.", 404);

    await sendEmail({
      to: user.email,
      subject: "Karigar account application update",
      template: "accountRejected",
      data: { name: user.name, reason: reason || "" },
    }).catch(() => {});

    await Student.deleteOne({ userId: user._id });
    await Mentor.deleteOne({ userId: user._id });
    await User.findByIdAndDelete(user._id);

    res.json({ success: true, message: "Account application rejected and removed." });
  } catch (error) {
    next(error);
  }
});

// ── Get a user's full account + profile (admin omnipotent edit) ─
router.get("/users/:userId/full", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) throw createError("User not found.", 404);
    let profile: unknown = null;
    if (user.role === "student") profile = await Student.findOne({ userId: user._id });
    else if (user.role === "mentor") profile = await Mentor.findOne({ userId: user._id }).select("+certificateFiles +bankAccounts");
    res.json({ success: true, data: { user, profile } });
  } catch (error) {
    next(error);
  }
});

// ── Update a user's full account + profile in one call ─────────
router.put("/users/:userId/full", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { user: userData, profile: profileData } = req.body as {
      user?: Record<string, unknown>;
      profile?: Record<string, unknown>;
    };
    const user = await User.findById(req.params.userId);
    if (!user) throw createError("User not found.", 404);

    if (userData) {
      if (userData.email) {
        const clash = await User.findOne({ email: String(userData.email).toLowerCase(), _id: { $ne: user._id } });
        if (clash) throw createError("That email is already in use by another account.", 409);
      }
      const userFields = ["name", "email", "phone", "status", "profilePicture"] as const;
      for (const k of userFields) {
        if (userData[k] !== undefined) {
          (user as unknown as Record<string, unknown>)[k] = k === "email" ? String(userData[k]).toLowerCase() : userData[k];
        }
      }
      await user.save();
    }

    if (profileData) {
      // Never allow changing the linkage.
      delete profileData.userId;
      delete profileData._id;
      if (user.role === "student") await Student.findOneAndUpdate({ userId: user._id }, profileData, { runValidators: true });
      else if (user.role === "mentor") await Mentor.findOneAndUpdate({ userId: user._id }, profileData, { runValidators: true });
    }

    res.json({ success: true, message: "Profile updated." });
  } catch (error) {
    next(error);
  }
});

// ── Edit a user's core fields (name / email / phone) ───────────
router.put("/users/:userId", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, email, phone } = req.body;
    if (email) {
      const clash = await User.findOne({ email: String(email).toLowerCase(), _id: { $ne: req.params.userId } });
      if (clash) throw createError("That email is already in use by another account.", 409);
    }
    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name;
    if (email !== undefined) update.email = String(email).toLowerCase();
    if (phone !== undefined) update.phone = phone;

    const user = await User.findByIdAndUpdate(req.params.userId, update, { new: true, runValidators: true });
    if (!user) throw createError("User not found.", 404);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// ── Suspend / Unsuspend User ───────────────────────────────────
router.put("/users/:userId/status", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body; // "active" | "suspended"
    const user = await User.findByIdAndUpdate(req.params.userId, { status }, { new: true });
    if (!user) throw createError("User not found.", 404);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// ── Delete User ────────────────────────────────────────────────
router.delete("/users/:userId", async (req, res: Response, next: NextFunction) => {
  try {
    const user = await User.findByIdAndDelete(req.params.userId);
    if (!user) throw createError("User not found.", 404);
    await Student.deleteOne({ userId: req.params.userId });
    await Mentor.deleteOne({ userId: req.params.userId });
    res.json({ success: true, message: "User deleted." });
  } catch (error) {
    next(error);
  }
});

// ── Cancel Session ─────────────────────────────────────────────
router.put("/sessions/:sessionId/cancel", async (req, res: Response, next: NextFunction) => {
  try {
    const session = await Session.findByIdAndUpdate(req.params.sessionId, { status: "CANCELLED" }, { new: true });
    if (!session) throw createError("Session not found.", 404);
    res.json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
});

// ── Delete Session (permanent) ─────────────────────────────────
// Removes the session and its payment + review, then recomputes the mentor's
// rating + completed-session count.
router.delete("/sessions/:sessionId", async (req, res: Response, next: NextFunction) => {
  try {
    const session = await Session.findById(req.params.sessionId);
    if (!session) throw createError("Session not found.", 404);
    const mentorId = session.mentorId.toString();

    await Payment.deleteMany({ sessionId: session._id });
    await Review.deleteMany({ sessionId: session._id });
    await Session.findByIdAndDelete(session._id);

    const completed = await Session.countDocuments({ mentorId, status: "COMPLETED" });
    const reviews = await Review.find({ mentorId }).select("rating");
    const avg = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;
    await Mentor.findOneAndUpdate({ userId: mentorId }, { sessionsCount: completed, rating: Math.round(avg * 10) / 10 });

    res.json({ success: true, message: "Session deleted." });
  } catch (error) {
    next(error);
  }
});

export default router;
