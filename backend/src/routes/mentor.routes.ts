import { Router, Response, NextFunction } from "express";
import { authenticate, authorize, AuthRequest } from "../middlewares/auth.middleware";
import Mentor from "../models/Mentor.model";
import User from "../models/User.model";
import Review from "../models/Review.model";
import { createError } from "../middlewares/errorHandler";

const router = Router();

// GET /api/mentors — public listing
// Supports: type (academic|industry), field (single or comma-separated),
// city, minRate, maxRate, search, pagination.
router.get("/", async (req, res, next) => {
  try {
    const { type, field, city, minRate, maxRate, search, badge, page = 1, limit = 50 } = req.query;
    const filter: Record<string, unknown> = { isApproved: true };

    if (type && type !== "all" && type !== "both") {
      filter.type = type;
    }
    if (badge && badge !== "all") {
      filter.badge = badge === "none" ? { $in: ["none", null] } : badge;
    }
    if (field && field !== "all") {
      const fields = String(field).split(",").map((f) => f.trim()).filter(Boolean);
      filter.field = fields.length > 1 ? { $in: fields } : fields[0];
    }
    if (city && city !== "all") filter.city = { $regex: String(city), $options: "i" };
    if (minRate || maxRate) {
      filter.hourlyRate = {
        ...(minRate ? { $gte: Number(minRate) } : {}),
        ...(maxRate ? { $lte: Number(maxRate) } : {}),
      };
    }
    if (search) {
      filter.$text = { $search: search as string };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const mentors = await Mentor.find(filter)
      .select("-phone") // phone is private — never exposed to students
      .populate("userId", "name email profilePicture")
      .skip(skip)
      .limit(Number(limit))
      .sort({ rating: -1, sessionsCount: -1 });

    const total = await Mentor.countDocuments(filter);
    res.json({ success: true, data: mentors, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    next(error);
  }
});

// GET /api/mentors/me/reviews — the logged-in mentor's own reviews (defined
// before /:id so "me" isn't treated as an id).
router.get("/me/reviews", authenticate, authorize("mentor"), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reviews = await Review.find({ mentorId: req.user!.id })
      .populate("studentId", "name profilePicture")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: reviews });
  } catch (error) {
    next(error);
  }
});

// GET /api/mentors/:id — public profile
router.get("/:id", async (req, res, next) => {
  try {
    const mentor = await Mentor.findById(req.params.id).select("-phone").populate("userId", "name email profilePicture");
    if (!mentor) throw createError("Mentor not found.", 404);
    res.json({ success: true, data: mentor });
  } catch (error) {
    next(error);
  }
});

// GET /api/mentors/:id/reviews — public: reviews students left for this mentor
router.get("/:id/reviews", async (req, res, next) => {
  try {
    const mentor = await Mentor.findById(req.params.id).select("userId");
    if (!mentor) throw createError("Mentor not found.", 404);
    const reviews = await Review.find({ mentorId: mentor.userId })
      .populate("studentId", "name profilePicture")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: reviews });
  } catch (error) {
    next(error);
  }
});

// PUT /api/mentors/:id — mentor updates own profile
router.put("/:id", authenticate, authorize("mentor", "admin"), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const update = { ...req.body };
    // The session rate is a fixed platform amount — mentors cannot change it.
    // (Admins edit users via the dedicated /admin route.)
    delete update.hourlyRate;
    const mentor = await Mentor.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!mentor) throw createError("Mentor not found.", 404);
    res.json({ success: true, data: mentor });
  } catch (error) {
    next(error);
  }
});

export default router;
