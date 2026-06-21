import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import {
  initiatePayment, confirmPayment, declinePayment, processDummyPayment,
  getBankDetails, getReceipt, sendMentorPayout, getPayoutReceipt, listPayouts, listPayoutHistory,
} from "../controllers/payment.controller";

const router = Router();

router.use(authenticate);

router.get("/bank-details", getBankDetails);
router.post("/initiate", initiatePayment);
router.post("/process", processDummyPayment);
router.get("/payouts", authorize("admin"), listPayouts);
router.get("/payouts/history", authorize("admin"), listPayoutHistory);
router.get("/:paymentId/receipt", authorize("admin"), getReceipt);
router.get("/:paymentId/payout-receipt", getPayoutReceipt); // admin or the mentor (checked in controller)
router.put("/:paymentId/payout", authorize("admin"), sendMentorPayout);
router.put("/:paymentId/confirm", authorize("admin"), confirmPayment);
router.put("/:paymentId/decline", authorize("admin"), declinePayment);

export default router;
