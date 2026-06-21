import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import {
  getMyBadge,
  applyForBadge,
  listBadgeRequests,
  getBadgeReceipt,
  approveBadgeRequest,
  declineBadgeRequest,
  grantBadge,
} from "../controllers/badge.controller";

const router = Router();

router.use(authenticate);

// Mentor
router.get("/me", authorize("mentor"), getMyBadge);
router.post("/apply", authorize("mentor"), applyForBadge);

// Admin
router.get("/requests", authorize("admin"), listBadgeRequests);
router.get("/requests/:requestId/receipt", authorize("admin"), getBadgeReceipt);
router.put("/requests/:requestId/approve", authorize("admin"), approveBadgeRequest);
router.put("/requests/:requestId/decline", authorize("admin"), declineBadgeRequest);
router.put("/mentors/:mentorId/grant", authorize("admin"), grantBadge);

export default router;
