import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import {
  createSession,
  getSessions,
  getSession,
  updateSessionStatus,
  requestReschedule,
  respondReschedule,
  submitReview,
  getCallConfig,
  cancelOwnSession,
  getSessionReview,
  uploadSessionFile,
  listSessionFiles,
  getSessionFile,
} from "../controllers/session.controller";

const router = Router();

router.use(authenticate);

router.post("/", createSession);
router.get("/", getSessions);
router.get("/:sessionId", getSession);
router.get("/:sessionId/call-config", getCallConfig);
router.get("/:sessionId/review", getSessionReview);
router.put("/:sessionId/status", authorize("mentor"), updateSessionStatus);
router.put("/:sessionId/reschedule", authorize("mentor"), requestReschedule);
router.put("/:sessionId/reschedule-response", authorize("student"), respondReschedule);
router.post("/:sessionId/review", authorize("student"), submitReview);
router.delete("/:sessionId", authorize("student"), cancelOwnSession);

// In-call document sharing (either participant)
router.post("/:sessionId/files", uploadSessionFile);
router.get("/:sessionId/files", listSessionFiles);
router.get("/:sessionId/files/:fileId", getSessionFile);

export default router;
