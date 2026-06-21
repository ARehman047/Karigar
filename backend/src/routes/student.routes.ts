import { Router, Response, NextFunction } from "express";
import { authenticate, authorize, AuthRequest } from "../middlewares/auth.middleware";
import Student from "../models/Student.model";
import { createError } from "../middlewares/errorHandler";

const router = Router();

// GET /api/students — admin only
router.get("/", authenticate, authorize("admin"), async (_req, res, next) => {
  try {
    const students = await Student.find().populate("userId", "name email status");
    res.json({ success: true, data: students });
  } catch (error) {
    next(error);
  }
});

// GET /api/students/:id — own profile or admin
router.get("/:id", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const student = await Student.findById(req.params.id).populate("userId", "name email status profilePicture");
    if (!student) throw createError("Student not found.", 404);
    res.json({ success: true, data: student });
  } catch (error) {
    next(error);
  }
});

// PUT /api/students/:id — own update or admin
router.put("/:id", authenticate, authorize("student", "admin"), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!student) throw createError("Student not found.", 404);
    res.json({ success: true, data: student });
  } catch (error) {
    next(error);
  }
});

export default router;
