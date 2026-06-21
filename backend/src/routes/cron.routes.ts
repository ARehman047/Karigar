import { Router, Request, Response } from "express";
import { runScheduledTasks } from "../jobs/reminder.job";

const router = Router();

// GET /api/cron — runs the scheduled tasks (auto-complete ended sessions + send
// session reminders) ONCE. On serverless (Vercel) there is no long-running
// node-cron process, so an external scheduler pings this endpoint instead.
//
// Protected by CRON_SECRET. Provide it as any of:
//   • ?key=<secret>                (query string — easiest for cron-job.org)
//   • header "x-cron-key: <secret>"
//   • header "Authorization: Bearer <secret>"  (Vercel Cron sends this automatically)
// If CRON_SECRET is unset, the endpoint is open (fine for local dev only).
router.get("/", async (req: Request, res: Response) => {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided =
      (req.query.key as string) ||
      (req.headers["x-cron-key"] as string) ||
      (req.headers.authorization?.replace(/^Bearer\s+/i, "") ?? "");
    if (provided !== secret) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
  }

  try {
    await runScheduledTasks();
    res.json({ success: true, ranAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

export default router;
