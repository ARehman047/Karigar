import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import Session from "../models/Session.model";
import User from "../models/User.model";
import Payment from "../models/Payment.model";
import Notification from "../models/Notification.model";
import Mentor from "../models/Mentor.model";
import Review from "../models/Review.model";
import { AuthRequest } from "../middlewares/auth.middleware";
import { createError } from "../middlewares/errorHandler";
import { sendEmail } from "../utils/email";
import { createCalendarEvent, updateCalendarEvent } from "../utils/googleCalendar";
import { buildICS } from "../utils/ics";
import { checkBadgeEligibility } from "./badge.controller";
import { packageByName } from "../config/pricing";
import { v4 as uuidv4 } from "uuid";

const idOf = (ref: unknown): string => {
  if (!ref) return "";
  if (typeof ref === "string") return ref;
  const obj = ref as { _id?: { toString(): string } };
  return obj._id ? obj._id.toString() : String(ref);
};

// Create/update each connected participant's Google Calendar event for a session.
// Best-effort: never throws — disconnected calendars are simply skipped, and the
// calendar (Google) then handles its own reminder notifications.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function syncSessionCalendar(session: any): Promise<void> {
  const student = session.studentId as { _id: string; name: string };
  const mentor = session.mentorId as { _id: string; name: string };

  // Link to the in-app call page (real JaaS room), not the legacy meet.jit.si link.
  const clientBase = (process.env.CLIENT_URL || "http://localhost:8080").split(",")[0].trim();
  const joinLink = `${clientBase}/session/${session._id}/call`;

  const ensure = async (userId: string, otherName: string, existingId?: string): Promise<string | undefined> => {
    try {
      const u = await User.findById(userId).select("+googleCalendar.refreshToken");
      const rt = u?.googleCalendar?.refreshToken;
      if (!u?.googleCalendar?.connected || !rt) return existingId; // not connected → skip
      const input = {
        topic: session.topic,
        date: session.date,
        time: session.time,
        duration: session.duration,
        otherPartyName: otherName,
        meetingLink: joinLink,
      };
      if (existingId) {
        await updateCalendarEvent(rt, existingId, input);
        return existingId;
      }
      return await createCalendarEvent(rt, input);
    } catch (err) {
      console.error("[calendar] sync failed:", (err as Error).message);
      return existingId;
    }
  };

  const studentEventId = await ensure(idOf(student), mentor?.name || "your mentor", session.calendarEvents?.studentEventId);
  const mentorEventId = await ensure(idOf(mentor), student?.name || "your student", session.calendarEvents?.mentorEventId);
  session.calendarEvents = { studentEventId, mentorEventId };
  await session.save();
}

// Email an .ics calendar invite to each party who has NOT connected Google
// Calendar (connected users already get the event auto-added by syncSessionCalendar).
// This guarantees everyone gets the session on their calendar with reminders.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendSessionInvites(session: any): Promise<void> {
  const student = session.studentId as { _id: string; name: string; email: string };
  const mentor = session.mentorId as { _id: string; name: string; email: string };

  const clientBase = (process.env.CLIENT_URL || "http://localhost:8080").split(",")[0].trim();
  const joinLink = `${clientBase}/session/${session._id}/call`;
  const support = process.env.ADMIN_EMAIL || "karigarcareers@gmail.com";

  // Start/end as real Date objects (sessions are in Pakistan time, +05:00).
  const m = String(session.time || "").match(/(\d{1,2}):(\d{2})/);
  const hh = m ? m[1].padStart(2, "0") : "09";
  const mm = m ? m[2] : "00";
  const start = new Date(`${session.date}T${hh}:${mm}:00+05:00`);
  if (isNaN(start.getTime())) return;
  const end = new Date(start.getTime() + (session.duration || 60) * 60 * 1000);
  const seq = session.inviteSeq || 0;

  const inviteParty = async (party: { _id: string; name: string; email: string }, otherName: string) => {
    if (!party?.email) return;
    try {
      // Skip anyone already covered by the connected-calendar auto-add.
      const u = await User.findById(idOf(party)).select("googleCalendar");
      if (u?.googleCalendar?.connected) return;

      const ics = buildICS({
        uid: `session-${session._id}@karigar`,
        sequence: seq,
        summary: `Karigar Session: ${session.topic}`,
        description: `Your Karigar mentorship session with ${otherName}.\nTopic: ${session.topic}\nJoin the call: ${joinLink}`,
        location: joinLink,
        start,
        end,
        organizerName: "Karigar",
        organizerEmail: support,
        attendeeName: party.name || "Karigar User",
        attendeeEmail: party.email,
      });

      await sendEmail({
        to: party.email,
        subject: "Your Karigar session — add to your calendar",
        template: "sessionInvite",
        data: { name: party.name, withName: otherName, dateLabel: session.date, timeLabel: session.time },
        attachments: [
          { filename: "karigar-session.ics", content: ics, contentType: "text/calendar; method=REQUEST; charset=UTF-8" },
        ],
      });
    } catch (err) {
      console.error("[invite] failed:", (err as Error).message);
    }
  };

  await inviteParty(student, mentor?.name || "your mentor");
  await inviteParty(mentor, student?.name || "your student");
}

// ── Create Session ─────────────────────────────────────────────
// `mentorId` in the body is the mentor's USER id.
export const createSession = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { mentorId, date, time, topic, type, message, amount, packageName } = req.body;
    const studentId = req.user!.id;
    // Sessions are fixed at one hour.
    const duration = 60;

    const mentor = await Mentor.findOne({ userId: mentorId });
    if (!mentor || !mentor.isApproved) throw createError("Mentor not found or not approved.", 404);

    // Snapshot both names so the session stays readable even if an account is later deleted.
    const [studentUser, mentorUser] = await Promise.all([
      User.findById(studentId).select("name"),
      User.findById(mentorId).select("name"),
    ]);

    // Reject slots in the past. Times are in Pakistan local time (Asia/Karachi, +05:00),
    // so we anchor the comparison to that offset regardless of server timezone.
    const startMatch = String(time || "").match(/(\d{1,2}):(\d{2})/);
    if (date && startMatch) {
      const hhmm = `${startMatch[1].padStart(2, "0")}:${startMatch[2]}`;
      const slotInstant = new Date(`${date}T${hhmm}:00+05:00`).getTime();
      if (!Number.isNaN(slotInstant) && slotInstant <= Date.now()) {
        throw createError("That time slot has already passed. Please choose a future slot.", 400);
      }
    }

    // Pricing is driven by the canonical package config (server-authoritative,
    // so the amount can't be tampered with). Fall back to any client amount only
    // for unknown packages.
    const pkg = packageByName(packageName);
    const finalAmount = pkg ? pkg.studentPrice : typeof amount === "number" && amount > 0 ? amount : mentor.hourlyRate;
    const finalMentorPayout = pkg ? pkg.mentorPayout : mentor.hourlyRate;

    const session = await Session.create({
      studentId,
      mentorId,
      studentName: studentUser?.name || "",
      mentorName: mentorUser?.name || "",
      date,
      time,
      duration,
      topic,
      type: type || "video",
      packageName,
      mentorPayout: finalMentorPayout,
      message,
      amount: finalAmount,
      roomId: `room-${uuidv4()}`,
      status: "PENDING_PAYMENT",
    });

    await Payment.create({ sessionId: session._id, studentId, mentorId, amount: finalAmount, status: "PENDING" });

    res.status(201).json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
};

// ── Get Sessions (role-scoped) ─────────────────────────────────
export const getSessions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { role, id } = req.user!;
    const base = role === "student" ? { studentId: id } : role === "mentor" ? { mentorId: id } : {};
    const { status } = req.query;
    const filter = { ...base, ...(status ? { status } : {}) };

    const sessions = await Session.find(filter)
      .populate("studentId", "name email")
      .populate("mentorId", "name email")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: sessions });
  } catch (error) {
    next(error);
  }
};

// ── Get single session ─────────────────────────────────────────
export const getSession = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const session = await Session.findById(req.params.sessionId)
      .populate("studentId", "name email")
      .populate("mentorId", "name email");
    if (!session) throw createError("Session not found.", 404);

    const { role, id } = req.user!;
    if (role !== "admin" && idOf(session.studentId) !== id && idOf(session.mentorId) !== id) {
      throw createError("Forbidden", 403);
    }

    res.json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
};

// ── Approve / Reject Session (Mentor) ─────────────────────────
// Declining REQUIRES a reason — it's emailed to the student.
export const updateSessionStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { action, reason } = req.body; // "approve" | "reject"
    const mentorUserId = req.user!.id;

    const session = await Session.findById(sessionId)
      .populate("studentId", "name email")
      .populate("mentorId", "name email");

    if (!session) throw createError("Session not found.", 404);
    if (idOf(session.mentorId) !== mentorUserId) throw createError("Forbidden", 403);
    if (session.status !== "PENDING_MENTOR_APPROVAL") throw createError("Session is not pending approval.", 400);

    const approved = action === "approve";

    if (!approved && (!reason || !String(reason).trim())) {
      throw createError("A reason is required to decline a session request.", 400);
    }

    session.status = approved ? "APPROVED" : "REJECTED";
    if (!approved) session.rejectionReason = String(reason).trim();
    if (approved && !session.meetingLink) {
      session.meetingLink = `https://meet.jit.si/karigar-${session.roomId || session._id}`;
    }
    await session.save();

    // Add the confirmed session to calendars: auto-add for connected Google
    // Calendar users, and email an .ics invite to everyone else.
    if (approved) {
      await syncSessionCalendar(session);
      await sendSessionInvites(session);
    }

    const studentUser = session.studentId as unknown as { _id: string; name: string; email: string };

    await Notification.create({
      userId: studentUser._id,
      title: approved ? "Session Approved!" : "Session Request Declined",
      message: approved
        ? "Your session has been approved. Check your sessions for the meeting details."
        : `Your session request was declined. Reason: ${session.rejectionReason}`,
      type: approved ? "session_approved" : "session_rejected",
      sessionId: session._id,
    });

    await sendEmail({
      to: studentUser.email,
      subject: approved ? "Session Approved - Karigar" : "Session Request Declined - Karigar",
      template: approved ? "sessionApproval" : "sessionRejected",
      data: { name: studentUser.name, session, reason: session.rejectionReason },
    }).catch(() => {});

    res.json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
};

// ── Get a session's review (participant) ───────────────────────
export const getSessionReview = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const session = await Session.findById(req.params.sessionId);
    if (!session) throw createError("Session not found.", 404);
    const { role, id } = req.user!;
    if (role !== "admin" && idOf(session.studentId) !== id && idOf(session.mentorId) !== id) {
      throw createError("Forbidden", 403);
    }
    const review = await Review.findOne({ sessionId: session._id }).populate("studentId", "name profilePicture");
    if (!review) {
      res.json({ success: true, data: null });
      return;
    }
    const student = review.studentId as unknown as { name?: string };
    res.json({
      success: true,
      data: {
        rating: review.rating,
        comment: review.comment || "",
        studentName: student?.name || session.studentName || "Student",
        createdAt: (review as unknown as { createdAt?: Date }).createdAt || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── Cancel own unpaid session (Student) ────────────────────────
// A student can cancel a session they no longer want to pay for. Only allowed
// while it's still PENDING_PAYMENT (nothing has been paid yet). The session and
// its pending payment record are removed.
export const cancelOwnSession = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const studentId = req.user!.id;

    const session = await Session.findById(sessionId);
    if (!session) throw createError("Session not found.", 404);
    if (idOf(session.studentId) !== studentId) throw createError("Forbidden", 403);
    if (session.status !== "PENDING_PAYMENT") {
      throw createError("Only an unpaid session can be cancelled.", 400);
    }

    await Payment.deleteMany({ sessionId: session._id });
    await Session.findByIdAndDelete(session._id);

    res.json({ success: true, message: "Session cancelled." });
  } catch (error) {
    next(error);
  }
};

// ── Get video-call config/token (participant) ─────────────────
// Returns a JaaS (Jitsi-as-a-Service) moderator token if configured — this
// removes the lobby + 5-minute embed limit. Otherwise falls back to the public
// meet.jit.si server (demo limits apply).
const getJaasKey = (): string => {
  // Local dev: read the PEM from a file (JAAS_PRIVATE_KEY_PATH).
  const p = process.env.JAAS_PRIVATE_KEY_PATH;
  if (p) {
    try {
      return fs.readFileSync(path.isAbsolute(p) ? p : path.join(process.cwd(), p), "utf8");
    } catch {
      return "";
    }
  }
  // Production (e.g. Vercel): read the PEM from an env var (newlines or \n).
  return (process.env.JAAS_PRIVATE_KEY || "").replace(/\\n/g, "\n");
};

export const getCallConfig = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const session = await Session.findById(req.params.sessionId)
      .populate("studentId", "name email")
      .populate("mentorId", "name email");
    if (!session) throw createError("Session not found.", 404);

    const { role, id } = req.user!;
    if (role !== "admin" && idOf(session.studentId) !== id && idOf(session.mentorId) !== id) {
      throw createError("Forbidden", 403);
    }

    const room = `karigar-${session.roomId || session._id}`;
    const JAAS_APP_ID = process.env.JAAS_APP_ID;
    const JAAS_KID = process.env.JAAS_API_KEY_ID;

    if (!JAAS_APP_ID || !JAAS_KID || !getJaasKey()) {
      // Dev fallback — public Jitsi (lobby + 5-min embed limit apply).
      res.json({ success: true, data: { provider: "jitsi", domain: "meet.jit.si", appId: null, room, token: null } });
      return;
    }

    const me = await User.findById(id).select("name email");
    const now = Math.floor(Date.now() / 1000);
    const token = jwt.sign(
      {
        aud: "jitsi",
        iss: "chat",
        sub: JAAS_APP_ID,
        room: "*",
        iat: now,
        nbf: now - 10,
        exp: now + 6 * 60 * 60, // 6 hours — sessions can run an hour or much longer
        context: {
          user: {
            id,
            name: me?.name || "Karigar User",
            email: me?.email || "",
            moderator: "true", // both participants are moderators → no lobby
          },
          features: {
            recording: "false",
            livestreaming: "false",
            transcription: "false",
            "outbound-call": "false",
            "file-upload": "true", // allow sharing files in chat
          },
        },
      },
      getJaasKey(),
      { algorithm: "RS256", header: { alg: "RS256", kid: JAAS_KID, typ: "JWT" } }
    );

    res.json({ success: true, data: { provider: "jaas", domain: "8x8.vc", appId: JAAS_APP_ID, room, token } });
  } catch (error) {
    next(error);
  }
};

// ── Submit Review / Rating (Student) ──────────────────────────
// The student rates the mentor after the session. This marks the session
// COMPLETED and recomputes the mentor's average rating + completed count.
export const submitReview = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { rating, comment } = req.body;
    const studentId = req.user!.id;

    const numRating = Number(rating);
    if (!numRating || numRating < 1 || numRating > 5) {
      throw createError("Please provide a rating between 1 and 5.", 400);
    }

    const session = await Session.findById(sessionId);
    if (!session) throw createError("Session not found.", 404);
    if (idOf(session.studentId) !== studentId) throw createError("Forbidden", 403);
    if (!["APPROVED", "COMPLETED"].includes(session.status)) {
      throw createError("You can only review a session that took place.", 400);
    }
    if (session.reviewed) throw createError("You've already reviewed this session.", 409);

    await Review.create({
      sessionId: session._id,
      studentId,
      mentorId: session.mentorId,
      rating: numRating,
      comment: comment ? String(comment).trim() : undefined,
    });

    session.status = "COMPLETED";
    session.reviewed = true;
    await session.save();

    // Recompute the mentor's average rating + completed-session count.
    const mentorUserId = session.mentorId;
    const reviews = await Review.find({ mentorId: mentorUserId }).select("rating");
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / (reviews.length || 1);
    const completedCount = await Session.countDocuments({ mentorId: mentorUserId, status: "COMPLETED" });
    await Mentor.findOneAndUpdate(
      { userId: mentorUserId },
      { rating: Math.round(avg * 10) / 10, sessionsCount: completedCount }
    );

    // Auto-check badge eligibility (emails the admin if a threshold is crossed).
    await checkBadgeEligibility(idOf(mentorUserId));

    await Notification.create({
      userId: mentorUserId,
      title: "New Review",
      message: `You received a ${numRating}-star review for your session.`,
      type: "session_approved",
      sessionId: session._id,
    });

    res.json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
};

// ── Request Reschedule (Mentor) ───────────────────────────────
// Mentor proposes a new date/time with a MANDATORY reason. Student must respond.
export const requestReschedule = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { proposedDate, proposedTime, reason } = req.body;
    const mentorUserId = req.user!.id;

    const session = await Session.findById(sessionId)
      .populate("studentId", "name email")
      .populate("mentorId", "name email");

    if (!session) throw createError("Session not found.", 404);
    if (idOf(session.mentorId) !== mentorUserId) throw createError("Forbidden", 403);
    if (!["APPROVED", "PENDING_MENTOR_APPROVAL"].includes(session.status)) {
      throw createError("Only an approved or pending session can be rescheduled.", 400);
    }
    if (!proposedDate || !proposedTime) throw createError("Please propose a new date and time.", 400);
    if (!reason || !String(reason).trim()) throw createError("A reason is required to reschedule.", 400);

    session.status = "RESCHEDULE_REQUESTED";
    session.proposedDate = proposedDate;
    session.proposedTime = proposedTime;
    session.rescheduleReason = String(reason).trim();
    session.rescheduleRequestedBy = "mentor";
    await session.save();

    const studentUser = session.studentId as unknown as { _id: string; name: string; email: string };

    await Notification.create({
      userId: studentUser._id,
      title: "Reschedule Requested",
      message: `Your mentor proposed a new time: ${proposedDate} at ${proposedTime}. Reason: ${session.rescheduleReason}`,
      type: "session_reminder",
      sessionId: session._id,
    });

    await sendEmail({
      to: studentUser.email,
      subject: "Session Reschedule Requested - Karigar",
      template: "rescheduleRequest",
      data: { name: studentUser.name, proposedDate, proposedTime, reason: session.rescheduleReason },
    }).catch(() => {});

    res.json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
};

// ── Respond to Reschedule (Student) ───────────────────────────
export const respondReschedule = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { accept } = req.body;
    const studentUserId = req.user!.id;

    const session = await Session.findById(sessionId)
      .populate("studentId", "name email")
      .populate("mentorId", "name email");

    if (!session) throw createError("Session not found.", 404);
    if (idOf(session.studentId) !== studentUserId) throw createError("Forbidden", 403);
    if (session.status !== "RESCHEDULE_REQUESTED") throw createError("No pending reschedule for this session.", 400);

    const mentorUser = session.mentorId as unknown as { _id: string; name: string; email: string };
    const accepted = !!accept;

    if (accepted) {
      session.date = session.proposedDate || session.date;
      session.time = session.proposedTime || session.time;
    }
    session.status = "APPROVED";
    session.proposedDate = undefined;
    session.proposedTime = undefined;
    session.rescheduleReason = undefined;
    session.rescheduleRequestedBy = undefined;
    await session.save();

    // Keep calendars in sync with the (possibly new) confirmed time. Bump the
    // invite sequence so the re-sent .ics supersedes the previous one.
    session.inviteSeq = (session.inviteSeq || 0) + 1;
    await session.save();
    await syncSessionCalendar(session);
    await sendSessionInvites(session);

    await Notification.create({
      userId: mentorUser._id,
      title: accepted ? "Reschedule Accepted" : "Reschedule Declined",
      message: accepted
        ? `The student accepted the new time. The session is now on ${session.date} at ${session.time}.`
        : "The student declined the proposed new time. The session keeps its original schedule.",
      type: "session_approved",
      sessionId: session._id,
    });

    await sendEmail({
      to: mentorUser.email,
      subject: accepted ? "Reschedule Accepted - Karigar" : "Reschedule Declined - Karigar",
      template: accepted ? "rescheduleAccepted" : "rescheduleDeclined",
      data: { name: mentorUser.name, proposedDate: session.date, proposedTime: session.time },
    }).catch(() => {});

    res.json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
};
