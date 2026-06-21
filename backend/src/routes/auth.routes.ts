import { Router } from "express";
import {
  register, login, logout, forgotPassword, getMe, updateMe, googleAuth, sendOtp, verifyOtp,
  getCalendarAuthUrl, calendarCallback, disconnectCalendar, refreshAccessToken, deleteOwnAccount,
} from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refreshAccessToken);
router.post("/google", googleAuth);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.get("/me", authenticate, getMe);
router.put("/me", authenticate, updateMe);
router.delete("/me", authenticate, deleteOwnAccount);

// Google Calendar connect flow
router.get("/google/calendar/url", authenticate, getCalendarAuthUrl);
router.get("/google/calendar/callback", calendarCallback); // public — Google redirects here
router.delete("/google/calendar", authenticate, disconnectCalendar);

export default router;
