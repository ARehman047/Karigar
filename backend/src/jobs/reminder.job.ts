import cron from "node-cron";
import Session from "../models/Session.model";
import User from "../models/User.model";
import Mentor from "../models/Mentor.model";
import Notification from "../models/Notification.model";
import { sendEmail } from "../utils/email";
import { checkBadgeEligibility } from "../controllers/badge.controller";

// Mark APPROVED sessions whose time has passed as COMPLETED — completion does NOT
// require a review (the review/rating is optional). Recompute each affected
// mentor's completed-session count and re-check badge eligibility.
const completeEndedSessions = async () => {
  const approved = await Session.find({ status: "APPROVED" });
  const now = Date.now();
  const affectedMentors = new Set<string>();

  for (const s of approved) {
    const m = String(s.time || "").match(/(\d{1,2}):(\d{2})/);
    if (!m) continue;
    const start = new Date(`${s.date}T${m[1].padStart(2, "0")}:${m[2]}:00+05:00`).getTime();
    if (Number.isNaN(start)) continue;
    const end = start + (s.duration || 60) * 60 * 1000;
    if (end < now) {
      s.status = "COMPLETED";
      await s.save();
      affectedMentors.add(s.mentorId.toString());
    }
  }

  for (const mentorId of affectedMentors) {
    const count = await Session.countDocuments({ mentorId, status: "COMPLETED" });
    await Mentor.findOneAndUpdate({ userId: mentorId }, { sessionsCount: count });
    await checkBadgeEligibility(mentorId);
  }
};

const sendReminder = async (minutesBefore: number, label: string) => {
  const target = new Date(Date.now() + minutesBefore * 60 * 1000);
  const targetDate = target.toISOString().split("T")[0]; // "YYYY-MM-DD"
  const targetHour = target.getHours().toString().padStart(2, "0");
  const targetMin = target.getMinutes().toString().padStart(2, "0");
  const targetTime = `${targetHour}:${targetMin}`; // "HH:MM"

  // Match sessions on that date whose time is within ±2 minutes
  const sessions = await Session.find({
    status: "APPROVED",
    date: targetDate,
  }).populate("studentId mentorId");

  const filtered = sessions.filter((s) => {
    const [sh, sm] = s.time.split(":").map(Number);
    const [th, tm] = targetTime.split(":").map(Number);
    const diff = Math.abs((sh * 60 + sm) - (th * 60 + tm));
    return diff <= 2;
  });

  for (const session of filtered) {
    const participantIds = [session.studentId, session.mentorId].map((p) => (p as unknown as { _id: string })._id.toString());

    for (const userId of participantIds) {
      const user = await User.findById(userId);
      if (!user) continue;

      await Notification.create({
        userId,
        title: `Session in ${label}`,
        message: `Your session "${session.topic}" starts in ${label}. Click to join.`,
        type: "session_reminder",
        sessionId: session._id,
      });

      await sendEmail({
        to: user.email,
        subject: `Session Reminder - ${label} - Karigar`,
        template: "sessionReminder",
        data: { name: user.name, timeUntil: label, sessionId: session._id.toString() },
      }).catch(() => {});
    }
  }
};

// Run every scheduled task once. Used by the local node-cron schedule AND by the
// serverless cron endpoint (GET /api/cron) so reminders + auto-complete also work
// on Vercel, where a long-running node-cron process does not exist. Safe to re-run.
export const runScheduledTasks = async (): Promise<void> => {
  await completeEndedSessions();
  await sendReminder(60 * 24, "1 day");
  await sendReminder(60, "1 hour");
  await sendReminder(15, "15 minutes");
};

export const startReminderJobs = () => {
  // 1 day before — runs every hour to check
  cron.schedule("0 * * * *", () => sendReminder(60 * 24, "1 day").catch(console.error));

  // 1 hour before — runs every 15 min
  cron.schedule("*/15 * * * *", () => sendReminder(60, "1 hour").catch(console.error));

  // 15 min before — runs every 5 min
  cron.schedule("*/5 * * * *", () => sendReminder(15, "15 minutes").catch(console.error));

  // Auto-complete ended sessions — every 10 min, plus once shortly after startup
  // (delayed so the DB connection is ready).
  cron.schedule("*/10 * * * *", () => completeEndedSessions().catch(console.error));
  setTimeout(() => completeEndedSessions().catch(console.error), 6000);

  console.log("[Cron] Session reminder + auto-complete jobs scheduled.");
};
