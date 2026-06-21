import { Response, NextFunction } from "express";
import Payment from "../models/Payment.model";
import Session from "../models/Session.model";
import Notification from "../models/Notification.model";
import User from "../models/User.model";
import Mentor from "../models/Mentor.model";
import { packageByName } from "../config/pricing";
import { AuthRequest } from "../middlewares/auth.middleware";
import { createError } from "../middlewares/errorHandler";
import { sendEmail } from "../utils/email";
import { v4 as uuidv4 } from "uuid";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "karigarcareers@gmail.com";

interface PopulatedUser {
  _id: string;
  name: string;
  email: string;
}

// ── Bank transfer details (shown to the student on the payment page) ──
// Supports MULTIPLE accounts via numbered env vars (PAYMENT_ACCOUNT_1_*, _2_*, …),
// with a fallback to the legacy single-account vars. The student may pay to any one.
export const getBankDetails = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const accounts: { bankName: string; accountTitle: string; accountNumber: string; iban: string }[] = [];
    for (let i = 1; i <= 10; i++) {
      const bankName = process.env[`PAYMENT_ACCOUNT_${i}_BANK`];
      const accountNumber = process.env[`PAYMENT_ACCOUNT_${i}_NUMBER`];
      const iban = process.env[`PAYMENT_ACCOUNT_${i}_IBAN`];
      if (!bankName && !accountNumber && !iban) continue;
      accounts.push({
        bankName: bankName || "",
        accountTitle: process.env[`PAYMENT_ACCOUNT_${i}_TITLE`] || "",
        accountNumber: accountNumber || "",
        iban: iban || "",
      });
    }
    // Legacy single-account fallback.
    if (accounts.length === 0 && (process.env.PAYMENT_ACCOUNT_NUMBER || process.env.PAYMENT_IBAN)) {
      accounts.push({
        bankName: process.env.PAYMENT_BANK_NAME || "",
        accountTitle: process.env.PAYMENT_ACCOUNT_TITLE || "",
        accountNumber: process.env.PAYMENT_ACCOUNT_NUMBER || "",
        iban: process.env.PAYMENT_IBAN || "",
      });
    }

    res.json({ success: true, data: { accounts, note: process.env.PAYMENT_NOTE || "" } });
  } catch (error) {
    next(error);
  }
};

// ── Initiate Payment ───────────────────────────────────────────
export const initiatePayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sessionId } = req.body;
    const studentId = req.user!.id;

    const session = await Session.findById(sessionId);
    if (!session) throw createError("Session not found.", 404);
    if (session.status !== "PENDING_PAYMENT") throw createError("Session payment already processed.", 400);

    let payment = await Payment.findOne({ sessionId, studentId });
    if (!payment) {
      payment = await Payment.create({ sessionId, studentId, mentorId: session.mentorId, amount: session.amount, status: "PENDING" });
    }

    res.json({ success: true, data: { payment, sessionAmount: session.amount } });
  } catch (error) {
    next(error);
  }
};

// ── Submit Payment Receipt (Student) ───────────────────────────
// The student transfers the amount to the bank account shown on the payment page
// and uploads a receipt. The payment is recorded as submitted but NOT yet active:
// the session moves to PENDING_ADMIN_CONFIRMATION and the admin is notified to
// verify the receipt. Only after the admin confirms is the request forwarded to
// the mentor.
export const processDummyPayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sessionId, receipt } = req.body;
    const studentId = req.user!.id;

    if (!receipt || typeof receipt !== "string" || !receipt.startsWith("data:")) {
      throw createError("Please upload a valid payment receipt before submitting.", 400);
    }

    const session = await Session.findById(sessionId)
      .populate("studentId", "name email")
      .populate("mentorId", "name email");
    if (!session) throw createError("Session not found.", 404);

    let payment = await Payment.findOne({ sessionId, studentId });
    if (!payment) {
      payment = await Payment.create({ sessionId, studentId, mentorId: session.mentorId, amount: session.amount, status: "PENDING" });
    }

    payment.receiptImage = receipt;
    payment.studentPaidAt = new Date();
    payment.status = "PENDING"; // awaiting admin verification
    await payment.save();

    session.status = "PENDING_ADMIN_CONFIRMATION";
    session.paymentId = payment._id;
    await session.save();

    const student = session.studentId as unknown as PopulatedUser;
    const mentor = session.mentorId as unknown as PopulatedUser;

    // In-app notifications.
    await Notification.create({
      userId: student._id,
      title: "Payment Received",
      message: "We've received your payment. It's being verified — you'll be notified once it's confirmed.",
      type: "payment_approved",
      sessionId: session._id,
    });
    const admin = await User.findOne({ role: "admin" });
    if (admin) {
      await Notification.create({
        userId: admin._id,
        title: "Payment to confirm",
        message: `${student.name} paid Rs ${payment.amount.toLocaleString()} for a session with ${mentor.name}. Confirm to forward to the mentor.`,
        type: "payment_approved",
        sessionId: session._id,
      });
    }

    // Emails.
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: "Payment submitted — confirm receipt (Karigar)",
      template: "paymentSubmittedAdmin",
      data: { studentName: student.name, mentorName: mentor.name, amount: payment.amount },
    }).catch(() => {});
    await sendEmail({
      to: student.email,
      subject: "Payment received — Karigar",
      template: "paymentSubmittedStudent",
      data: { name: student.name, amount: payment.amount },
    }).catch(() => {});

    res.json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
};

// ── Get Receipt (Admin) ────────────────────────────────────────
// Fetches the uploaded receipt image on demand (kept out of the list payload).
export const getReceipt = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { paymentId } = req.params;
    const payment = await Payment.findById(paymentId).select("receiptImage");
    if (!payment) throw createError("Payment not found.", 404);
    res.json({ success: true, data: { receiptImage: payment.receiptImage || null } });
  } catch (error) {
    next(error);
  }
};

// ── Decline Payment (Admin) ────────────────────────────────────
// Admin couldn't verify the payment → mark it failed, cancel the session, and
// email the student the reason.
export const declinePayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { paymentId } = req.params;
    const { reason } = req.body;
    if (!reason || !String(reason).trim()) throw createError("A reason is required to decline a payment.", 400);

    const payment = await Payment.findById(paymentId)
      .populate("studentId", "name email")
      .populate("mentorId", "name email");

    if (!payment) throw createError("Payment not found.", 404);
    if (payment.status === "SUCCESS") throw createError("This payment is already confirmed; it can't be declined.", 400);

    payment.status = "FAILED";
    payment.declineReason = String(reason).trim();
    await payment.save();

    await Session.findByIdAndUpdate(payment.sessionId, { status: "CANCELLED", rejectionReason: payment.declineReason });

    const student = payment.studentId as unknown as PopulatedUser;

    await Notification.create({
      userId: student._id,
      title: "Payment Declined",
      message: `Your payment of Rs ${payment.amount.toLocaleString()} was declined. Reason: ${payment.declineReason}`,
      type: "session_cancelled",
      sessionId: payment.sessionId,
    });

    await sendEmail({
      to: student.email,
      subject: "Payment Declined — Karigar",
      template: "paymentDeclined",
      data: { name: student.name, amount: payment.amount, reason: payment.declineReason },
    }).catch(() => {});

    res.json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
};

// ── Confirm Payment received (Admin) ───────────────────────────
// Admin confirms the STUDENT's payment landed in the platform account. The
// session then moves to PENDING_MENTOR_PAYOUT — the admin must next send the
// mentor their share before the request is forwarded to the mentor.
export const confirmPayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findById(paymentId)
      .populate("studentId", "name email")
      .populate("mentorId", "name email");

    if (!payment) throw createError("Payment not found.", 404);
    if (payment.status === "SUCCESS") throw createError("Payment already confirmed.", 400);

    payment.status = "SUCCESS";
    payment.transactionId = `TXN-${uuidv4().split("-")[0].toUpperCase()}`;
    payment.paidAt = new Date();
    await payment.save();

    await Session.findByIdAndUpdate(payment.sessionId, { status: "PENDING_MENTOR_PAYOUT", paymentId: payment._id });

    const student = payment.studentId as unknown as PopulatedUser;

    // Admin reminder to send the mentor their payout.
    const admin = await User.findOne({ role: "admin" });
    if (admin) {
      await Notification.create({
        userId: admin._id,
        title: "Send mentor payout",
        message: `Payment confirmed for ${student.name}'s session. Send the mentor their share to forward the request.`,
        type: "payment_approved",
        sessionId: payment.sessionId,
      });
    }
    await Notification.create({
      userId: student._id,
      title: "Payment Confirmed",
      message: `Your payment of Rs ${payment.amount.toLocaleString()} is confirmed. We're finalizing your request with the mentor.`,
      type: "payment_approved",
      sessionId: payment.sessionId,
    });
    await sendEmail({
      to: student.email,
      subject: "Payment Confirmed — Karigar",
      template: "paymentConfirmation",
      data: { payment, session: null },
    }).catch(() => {});

    res.json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
};

// ── Send Mentor Payout (Admin) ─────────────────────────────────
// Admin transfers the mentor their share and uploads the payout receipt. Only
// then is the request forwarded to the mentor for approval.
export const sendMentorPayout = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { paymentId } = req.params;
    const { receipt } = req.body;
    if (!receipt || typeof receipt !== "string" || !receipt.startsWith("data:")) {
      throw createError("Please attach the payout receipt.", 400);
    }

    const payment = await Payment.findById(paymentId)
      .populate("studentId", "name email")
      .populate("mentorId", "name email");
    if (!payment) throw createError("Payment not found.", 404);
    if (payment.status !== "SUCCESS") throw createError("Confirm the student's payment first.", 400);

    const session = await Session.findById(payment.sessionId);
    if (!session) throw createError("Session not found.", 404);
    if (session.status !== "PENDING_MENTOR_PAYOUT") {
      throw createError("This session is not awaiting a mentor payout.", 400);
    }

    payment.mentorPayoutReceipt = receipt;
    payment.mentorPayoutAt = new Date();
    await payment.save();

    session.status = "PENDING_MENTOR_APPROVAL";
    await session.save();

    const mentor = payment.mentorId as unknown as PopulatedUser;
    const student = payment.studentId as unknown as PopulatedUser;

    await Notification.create({
      userId: mentor._id,
      title: "New Session Request",
      message: `${student.name} wants a session with you, and your payment has been sent. Review your payout, then accept or decline.`,
      type: "booking_created",
      sessionId: payment.sessionId,
    });
    await Notification.create({
      userId: student._id,
      title: "Request sent to mentor",
      message: "Your request has been forwarded to the mentor for approval.",
      type: "payment_approved",
      sessionId: payment.sessionId,
    });

    await sendEmail({
      to: mentor.email,
      subject: "New Session Booking — Karigar",
      template: "newBooking",
      data: { name: mentor.name, payment, session },
    }).catch(() => {});

    res.json({ success: true, data: { id: payment._id } });
  } catch (error) {
    next(error);
  }
};

// ── Get mentor payout receipt (admin or the mentor themselves) ──
export const getPayoutReceipt = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payment = await Payment.findById(req.params.paymentId).select("+mentorPayoutReceipt mentorId");
    if (!payment) throw createError("Payment not found.", 404);
    const { role, id } = req.user!;
    if (role !== "admin" && payment.mentorId.toString() !== id) throw createError("Forbidden", 403);
    res.json({ success: true, data: { receiptImage: payment.mentorPayoutReceipt || null } });
  } catch (error) {
    next(error);
  }
};

// ── Completed payout history (Admin) ───────────────────────────
// Payments where the mentor has already been paid — so conducted sessions show
// up as a payout record, not just the pending queue.
export const listPayoutHistory = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payments = await Payment.find({ mentorPayoutAt: { $ne: null } })
      .populate("studentId", "name")
      .populate("mentorId", "name")
      .populate("sessionId", "topic date packageName mentorPayout")
      .sort({ mentorPayoutAt: -1 });

    const rows = payments.map((p) => {
      const sess = p.sessionId as unknown as { topic?: string; date?: string; packageName?: string; mentorPayout?: number } | null;
      const student = p.studentId as unknown as { name?: string } | null;
      const mentor = p.mentorId as unknown as { name?: string } | null;
      return {
        paymentId: p._id,
        studentName: student?.name || "Student",
        mentorName: mentor?.name || "Mentor",
        topic: sess?.topic || "",
        packageName: sess?.packageName || "",
        date: sess?.date || "",
        amount: sess?.mentorPayout ?? packageByName(sess?.packageName)?.mentorPayout ?? 0,
        paidAt: p.mentorPayoutAt,
      };
    });

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// ── List mentor payouts (Admin) ────────────────────────────────
// Sessions whose student payment is in progress/confirmed but the mentor hasn't
// been paid yet. The entry appears once the student pays; the "Send" action is
// only enabled once the student's payment is confirmed (PENDING_MENTOR_PAYOUT).
export const listPayouts = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sessions = await Session.find({ status: { $in: ["PENDING_ADMIN_CONFIRMATION", "PENDING_MENTOR_PAYOUT"] } })
      .populate("studentId", "name")
      .populate("mentorId", "name")
      .sort({ createdAt: -1 });

    const rows = await Promise.all(
      sessions.map(async (s) => {
        const payment = await Payment.findOne({ sessionId: s._id }).select("_id mentorPayoutAt");
        const mentorProfile = await Mentor.findOne({ userId: s.mentorId }).select("+bankAccounts");
        const studentRef = s.studentId as unknown as { name?: string } | null;
        const mentorRef = s.mentorId as unknown as { name?: string } | null;
        return {
          sessionId: s._id,
          paymentId: payment?._id || null,
          topic: s.topic,
          packageName: s.packageName || "",
          date: s.date,
          time: s.time,
          amount: s.amount,
          mentorPayout: s.mentorPayout ?? packageByName(s.packageName)?.mentorPayout ?? 0,
          studentName: studentRef?.name || s.studentName || "Student",
          mentorName: mentorRef?.name || s.mentorName || "Mentor",
          sessionStatus: s.status,
          canPay: s.status === "PENDING_MENTOR_PAYOUT",
          payoutDone: !!payment?.mentorPayoutAt,
          mentorBankAccounts: mentorProfile?.bankAccounts || [],
        };
      })
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};
