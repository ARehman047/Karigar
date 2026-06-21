import { Router, Response, NextFunction } from "express";
import { authenticate, AuthRequest } from "../middlewares/auth.middleware";
import Notification from "../models/Notification.model";
import { createError } from "../middlewares/errorHandler";

const router = Router();

router.use(authenticate);

// GET /api/notifications — own notifications
router.get("/", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const notifications = await Notification.find({ userId: req.user!.id }).sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: notifications });
  } catch (error) {
    next(error);
  }
});

// PUT /api/notifications/:id/read
router.put("/:id/read", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!.id },
      { isRead: true },
      { new: true }
    );
    if (!notification) throw createError("Notification not found.", 404);
    res.json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/notifications/:id — remove a single notification
router.delete("/:id", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const deleted = await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user!.id });
    if (!deleted) throw createError("Notification not found.", 404);
    res.json({ success: true, message: "Notification removed." });
  } catch (error) {
    next(error);
  }
});

// PUT /api/notifications/read-all
router.put("/read-all", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await Notification.updateMany({ userId: req.user!.id, isRead: false }, { isRead: true });
    res.json({ success: true, message: "All notifications marked as read." });
  } catch (error) {
    next(error);
  }
});

export default router;
