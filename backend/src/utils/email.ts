import nodemailer from "nodemailer";

interface EmailAttachment {
  filename: string;
  content: string;
  contentType?: string;
}

interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
  attachments?: EmailAttachment[];
}

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:8080";
const SUPPORT_EMAIL = process.env.ADMIN_EMAIL || "karigarcareers@gmail.com";

let cachedTransporter: nodemailer.Transporter | null = null;

const getTransporter = (): nodemailer.Transporter => {
  if (cachedTransporter) return cachedTransporter;
  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return cachedTransporter;
};

const shell = (inner: string): string => `
  <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
    <div style="background: #6366f1; padding: 20px 24px;">
      <h1 style="color: #fff; margin: 0; font-size: 20px;">Karigar</h1>
    </div>
    <div style="padding: 24px;">${inner}</div>
    <div style="padding: 16px 24px; background: #f8fafc; color: #94a3b8; font-size: 12px;">
      <p style="margin: 0 0 6px;">For any queries, email us at <a href="mailto:${SUPPORT_EMAIL}" style="color:#6366f1;">${SUPPORT_EMAIL}</a>.</p>
      &copy; ${new Date().getFullYear()} Karigar — Empowering careers through expert mentorship.
    </div>
  </div>`;

const button = (href: string, label: string, color = "#6366f1"): string =>
  `<a href="${href}" style="display:inline-block;background:${color};color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:600;margin-top:8px;">${label}</a>`;

const getTemplate = (template: string, data: Record<string, unknown>): string => {
  const templates: Record<string, string> = {
    registration: shell(
      data.role === "mentor"
        ? `<h2 style="color:#1e293b;">Welcome to Karigar, ${data.name}!</h2>
           <p>Thank you for applying to become a <strong>mentor</strong>.</p>
           <p>Your profile is currently <strong>pending admin approval</strong>. We review every mentor to keep quality high. You'll receive another email as soon as it's activated, after which you can sign in.</p>`
        : `<h2 style="color:#1e293b;">Welcome to Karigar, ${data.name}!</h2>
           <p>Your student account is ready. You can sign in now and start finding mentors.</p>
           ${button(`${CLIENT_URL}/login`, "Sign In")}`
    ),

    adminNewAccount: shell(`
      <h2 style="color:#1e293b;">New ${data.role} awaiting approval</h2>
      <p>A new ${data.role} account has been registered and needs your review:</p>
      <ul>
        <li><strong>Name:</strong> ${data.name}</li>
        <li><strong>Email:</strong> ${data.email}</li>
        <li><strong>Role:</strong> ${data.role}</li>
      </ul>
      ${button(`${CLIENT_URL}/admin`, "Review in Admin Dashboard")}`),

    otpCode: shell(`
      <h2 style="color:#1e293b;">Verify your email</h2>
      <p>Use this code to verify your email and continue creating your Karigar account:</p>
      <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#6366f1;background:#f1f5f9;border-radius:10px;padding:16px;text-align:center;margin:12px 0;">${data.code}</div>
      <p style="color:#94a3b8;font-size:12px;">This code expires in 10 minutes. If you didn't request it, you can ignore this email.</p>`),

    accountApproved: shell(`
      <h2 style="color:#22c55e;">Your account has been approved!</h2>
      <p>Hi ${data.name}, great news — your ${data.role} account is now active.</p>
      ${button(`${CLIENT_URL}/login`, "Sign In", "#22c55e")}`),

    accountRejected: shell(`
      <h2 style="color:#ef4444;">Account application update</h2>
      <p>Hi ${data.name}, we're sorry to inform you that your account application was not approved at this time.</p>
      ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ""}
      <p>If you believe this is a mistake, please contact support.</p>`),

    passwordReset: shell(`
      <h2 style="color:#1e293b;">Password Reset</h2>
      <p>Hi ${data.name}, you requested a password reset.</p>
      ${button(String(data.resetUrl), "Reset Password")}
      <p style="color:#94a3b8;font-size:12px;margin-top:12px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>`),

    sessionApproval: shell(`
      <h2 style="color:#22c55e;">Session Approved!</h2>
      <p>Hi ${data.name}, your session has been approved by the mentor.</p>
      ${button(`${CLIENT_URL}/sessions`, "View Session", "#22c55e")}`),

    sessionRejected: shell(`
      <h2 style="color:#ef4444;">Session Request Declined</h2>
      <p>Hi ${data.name}, unfortunately your session request was declined by the mentor.</p>
      <p style="background:#fef2f2;border-radius:8px;padding:12px;"><strong>Reason:</strong> ${data.reason}</p>
      <p>Your payment will be refunded. You can book another mentor any time.</p>
      ${button(`${CLIENT_URL}/mentors`, "Find Another Mentor", "#6366f1")}`),

    rescheduleRequest: shell(`
      <h2 style="color:#f97316;">Reschedule Requested</h2>
      <p>Hi ${data.name}, your mentor has requested to reschedule your session.</p>
      <p><strong>Proposed new time:</strong> ${data.proposedDate} at ${data.proposedTime}</p>
      <p style="background:#fff7ed;border-radius:8px;padding:12px;"><strong>Reason:</strong> ${data.reason}</p>
      <p>Please accept or decline this new time from your sessions page.</p>
      ${button(`${CLIENT_URL}/sessions`, "Review Reschedule", "#f97316")}`),

    rescheduleAccepted: shell(`
      <h2 style="color:#22c55e;">Reschedule Accepted</h2>
      <p>Hi ${data.name}, the student accepted your new time.</p>
      <p><strong>New schedule:</strong> ${data.proposedDate} at ${data.proposedTime}</p>
      ${button(`${CLIENT_URL}/appointments`, "View Sessions", "#22c55e")}`),

    rescheduleDeclined: shell(`
      <h2 style="color:#ef4444;">Reschedule Declined</h2>
      <p>Hi ${data.name}, the student declined the proposed new time. The session remains at its original schedule.</p>
      ${button(`${CLIENT_URL}/appointments`, "View Sessions", "#6366f1")}`),

    paymentConfirmation: shell(`
      <h2 style="color:#1e293b;">Payment Confirmed</h2>
      <p>A payment of <strong>Rs ${(data.payment as { amount?: number })?.amount?.toLocaleString() ?? ""}</strong> has been confirmed.</p>
      ${button(`${CLIENT_URL}/sessions`, "View Session")}`),

    paymentAdmin: shell(`
      <h2 style="color:#f97316;">Payment received — action required</h2>
      <p>A student has submitted a payment of <strong>Rs ${(data.payment as { amount?: number })?.amount?.toLocaleString() ?? ""}</strong>.</p>
      ${button(`${CLIENT_URL}/admin`, "Review in Admin Dashboard", "#f97316")}`),

    paymentSubmittedAdmin: shell(`
      <h2 style="color:#f97316;">Payment submitted — confirm receipt</h2>
      <p><strong>${data.studentName}</strong> has paid <strong>Rs ${Number(data.amount || 0).toLocaleString()}</strong> for a session with <strong>${data.mentorName}</strong>.</p>
      <p>Please confirm the payment in the admin dashboard. Once confirmed, the request will be forwarded to the mentor for approval.</p>
      ${button(`${CLIENT_URL}/admin`, "Confirm Payment", "#f97316")}`),

    paymentDeclined: shell(`
      <h2 style="color:#ef4444;">Payment Declined</h2>
      <p>Hi ${data.name}, unfortunately your payment of <strong>Rs ${Number(data.amount || 0).toLocaleString()}</strong> could not be confirmed and the booking has been cancelled.</p>
      <p style="background:#fef2f2;border-radius:8px;padding:12px;"><strong>Reason:</strong> ${data.reason}</p>
      <p>If you believe this is a mistake, please reach out and you can try booking again.</p>
      ${button(`${CLIENT_URL}/mentors`, "Find a Mentor", "#6366f1")}`),

    paymentSubmittedStudent: shell(`
      <h2 style="color:#6366f1;">Payment Received</h2>
      <p>Hi ${data.name}, we've received your payment of <strong>Rs ${Number(data.amount || 0).toLocaleString()}</strong>.</p>
      <p>It's now being verified by our team. Once confirmed, your request will be sent to the mentor for approval and you'll be notified.</p>
      ${button(`${CLIENT_URL}/sessions`, "View Session")}`),

    newBooking: shell(`
      <h2 style="color:#f97316;">New Booking Request</h2>
      <p>Hi ${data.name}, a new session has been booked with you. Please review and approve it.</p>
      ${button(`${CLIENT_URL}/appointments`, "Review Request", "#f97316")}`),

    sessionReminder: shell(`
      <h2 style="color:#6366f1;">Session Reminder</h2>
      <p>Hi ${data.name}, your session starts in ${data.timeUntil}.</p>
      ${button(`${CLIENT_URL}/session/${data.sessionId}`, "Join Session")}`),

    badgeEligibleAdmin: shell(`
      <h2 style="color:#f59e0b;">Mentor eligible for a ${data.badge} badge</h2>
      <p><strong>${data.mentorName}</strong> has completed <strong>${data.completed}</strong> sessions and is now eligible for the <strong>${data.badge}</strong> badge.</p>
      <p>Please review their reviews, profile, and session history, then approve or decline the badge.</p>
      ${button(`${CLIENT_URL}/admin`, "Review in Admin Dashboard", "#f59e0b")}`),

    badgeApplicationAdmin: shell(`
      <h2 style="color:#f59e0b;">Badge application — verify payment</h2>
      <p><strong>${data.mentorName}</strong> has applied for the <strong>${data.badge}</strong> badge and paid the Rs ${Number(data.fee || 0).toLocaleString()} fee.</p>
      <p>Verify the uploaded payment receipt and review their profile, then approve or decline.</p>
      ${button(`${CLIENT_URL}/admin`, "Review in Admin Dashboard", "#f59e0b")}`),

    badgeApproved: shell(`
      <h2 style="color:#22c55e;">You've earned the ${data.badge} badge! 🏅</h2>
      <p>Congratulations ${data.name}, your <strong>${data.badge}</strong> badge is now live on your Karigar profile — students will see it when browsing mentors.</p>
      ${button(`${CLIENT_URL}/mentor-dashboard`, "View Dashboard", "#22c55e")}`),

    badgeDeclined: shell(`
      <h2 style="color:#ef4444;">Badge request update</h2>
      <p>Hi ${data.name}, your <strong>${data.badge}</strong> badge request was not approved at this time.</p>
      <p style="background:#fef2f2;border-radius:8px;padding:12px;"><strong>Reason:</strong> ${data.reason}</p>
      <p>You're welcome to apply again once the feedback is addressed.</p>
      ${button(`${CLIENT_URL}/mentor-dashboard`, "View Dashboard", "#6366f1")}`),

    sessionInvite: shell(`
      <h2 style="color:#6366f1;">Your session is scheduled</h2>
      <p>Hi ${data.name}, your Karigar session${data.withName ? ` with <strong>${data.withName}</strong>` : ""} is confirmed.</p>
      <p style="background:#f1f5f9;border-radius:8px;padding:12px;"><strong>When:</strong> ${data.dateLabel} at ${data.timeLabel}</p>
      <p>A calendar invite is attached to this email — open it to add the session to your calendar (Google, Outlook, or Apple) and get automatic reminders.</p>
      ${button(`${CLIENT_URL}/sessions`, "View Session")}`),
  };

  return templates[template] || shell(`<p>${JSON.stringify(data)}</p>`);
};

export const sendEmail = async ({ to, subject, template, data, attachments }: EmailOptions): Promise<void> => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`[Email skipped — SMTP not configured] To: ${to} | Subject: ${subject}`);
    return;
  }

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"Karigar" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
      to,
      subject,
      html: getTemplate(template, data),
      attachments,
    });
    console.log(`[Email sent] To: ${to} | Subject: ${subject}`);
  } catch (err) {
    console.error(`[Email failed] To: ${to} | Subject: ${subject}`, (err as Error).message);
  }
};
