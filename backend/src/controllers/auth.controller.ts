import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.model";
import Student from "../models/Student.model";
import Mentor from "../models/Mentor.model";
import Notification from "../models/Notification.model";
import Otp from "../models/Otp.model";
import { AuthRequest } from "../middlewares/auth.middleware";
import { createError } from "../middlewares/errorHandler";
import { sendEmail } from "../utils/email";
import { isCalendarConfigured, buildCalendarAuthUrl, exchangeCalendarCode } from "../utils/googleCalendar";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "karigarcareers@gmail.com";
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const hashCode = (code: string): string => crypto.createHash("sha256").update(code).digest("hex");
const isValidEmail = (e: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const smtpConfigured = (): boolean => !!(process.env.SMTP_USER && process.env.SMTP_PASS);

// ── Send email OTP ─────────────────────────────────────────────
export const sendOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const email = String(req.body.email || "").toLowerCase().trim();
    if (!email || !isValidEmail(email)) throw createError("Enter a valid email address.", 400);

    const existing = await User.findOne({ email });
    if (existing) {
      throw createError(
        `This email is already registered as a ${existing.role}. One email can only be used for one account — please sign in instead.`,
        409
      );
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await Otp.findOneAndUpdate(
      { email },
      { email, codeHash: hashCode(code), expiresAt, attempts: 0 },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await sendEmail({
      to: email,
      subject: "Your Karigar verification code",
      template: "otpCode",
      data: { code },
    }).catch(() => {});

    res.json({
      success: true,
      message: "Verification code sent to your email.",
      // In dev (no SMTP configured) return the code so signup can be tested.
      data: smtpConfigured() ? {} : { devCode: code },
    });
  } catch (error) {
    next(error);
  }
};

// ── Verify email OTP ───────────────────────────────────────────
export const verifyOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const email = String(req.body.email || "").toLowerCase().trim();
    const { code } = req.body;
    if (!email || !code) throw createError("Email and code are required.", 400);

    const secret = process.env.JWT_SECRET;
    if (!secret) throw createError("Server configuration error", 500);

    const rec = await Otp.findOne({ email });
    if (!rec) throw createError("No code requested for this email. Please request a new one.", 400);
    if (rec.expiresAt < new Date()) {
      await rec.deleteOne();
      throw createError("Code expired. Please request a new one.", 400);
    }
    if (rec.attempts >= 5) {
      await rec.deleteOne();
      throw createError("Too many incorrect attempts. Please request a new code.", 429);
    }
    if (rec.codeHash !== hashCode(String(code))) {
      rec.attempts += 1;
      await rec.save();
      throw createError("Incorrect code. Please try again.", 400);
    }

    await rec.deleteOne();
    const emailVerificationToken = jwt.sign({ email, purpose: "email_verify" }, secret, { expiresIn: "20m" });
    res.json({ success: true, data: { emailVerificationToken } });
  } catch (error) {
    next(error);
  }
};

const generateToken = (id: string, role: string, email: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not configured");
  return jwt.sign({ id, role, email }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
  } as jwt.SignOptions);
};

// Long-lived refresh token — used to silently mint new 1h access tokens so the
// user stays logged in without keeping a long-lived access token around.
const generateRefreshToken = (id: string): string => {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_REFRESH_SECRET not configured");
  return jwt.sign({ id, type: "refresh" }, secret, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  } as jwt.SignOptions);
};

// ── Register ───────────────────────────────────────────────────
// Both students and mentors are created in a "pending" state and must be
// approved by an admin before they can log in.
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, role, emailVerificationToken, ...profileData } = req.body;

    if (!["student", "mentor"].includes(role)) {
      throw createError("Invalid role. Must be student or mentor.", 400);
    }
    if (!name || !email || !password) {
      throw createError("Name, email and password are required.", 400);
    }
    if (String(password).length < 6) {
      throw createError("Password must be at least 6 characters.", 400);
    }

    // Email must be verified via OTP before an account can be created.
    if (!emailVerificationToken) throw createError("Please verify your email first.", 400);
    try {
      const secret = process.env.JWT_SECRET as string;
      const decoded = jwt.verify(emailVerificationToken, secret) as { email: string; purpose: string };
      if (decoded.purpose !== "email_verify" || decoded.email.toLowerCase() !== String(email).toLowerCase()) {
        throw new Error("mismatch");
      }
    } catch {
      throw createError("Email verification failed or expired. Please verify your email again.", 400);
    }

    const existing = await User.findOne({ email: String(email).toLowerCase() });
    if (existing) {
      throw createError(
        `This email is already registered as a ${existing.role}. One email can only be used for one account.`,
        409
      );
    }

    // Students are activated immediately. Mentors must be vetted/approved by an
    // admin before they can log in (a bad mentor could harm the platform's reputation).
    const user = await User.create({
      name,
      email,
      password,
      role,
      phone: profileData.phoneNumber || profileData.phone,
      status: role === "mentor" ? "pending" : "active",
    });

    // Create the role-specific profile.
    if (role === "student") {
      await Student.create({
        userId: user._id,
        phone: profileData.phoneNumber,
        dateOfBirth: profileData.dateOfBirth || undefined,
        gender: profileData.gender,
        country: profileData.country,
        city: profileData.city,
        educationLevel: profileData.educationLevel,
        institution: profileData.institution,
        fieldOfStudy: profileData.fieldOfStudy,
        careerGoals: profileData.careerGoals,
        interests: profileData.interests || [],
        preferredMentorType: profileData.preferredMentorType || "both",
        preferredFields: profileData.preferredFields || [],
        preferredMentorCategories: profileData.preferredMentorCategories || [],
        bio: profileData.bio,
        linkedin: profileData.linkedin,
        github: profileData.github,
        timezone: profileData.timezone || "Asia/Karachi",
      });
    } else {
      await Mentor.create({
        userId: user._id,
        phone: profileData.phoneNumber,
        dateOfBirth: profileData.dateOfBirth || undefined,
        gender: profileData.gender,
        country: profileData.country,
        city: profileData.city,
        type: profileData.type || "industry",
        field: profileData.field || profileData.specialization || "Other",
        expertise: profileData.expertise || profileData.skills || [],
        title: profileData.title || profileData.designation,
        qualification: profileData.qualification || profileData.education,
        education: profileData.education,
        university: profileData.university,
        designation: profileData.designation,
        company: profileData.company,
        yearsOfExperience: Number(profileData.yearsOfExperience) || 0,
        specialization: profileData.specialization,
        subjects: profileData.subjects || [],
        skills: profileData.skills || [],
        languages: profileData.languages || [],
        hourlyRate: 4000, // fixed platform rate — mentors cannot set/alter it
        bankAccounts: Array.isArray(profileData.bankAccounts) ? profileData.bankAccounts : [],
        specialities: Array.isArray(profileData.specialities) ? profileData.specialities : [],
        bio: profileData.bio,
        achievements: profileData.achievements,
        certifications: profileData.certifications,
        certificateFiles: Array.isArray(profileData.certificateFiles) ? profileData.certificateFiles : [],
        linkedin: profileData.linkedin,
        github: profileData.github,
        timezone: profileData.timezone || "Asia/Karachi",
        availableDays: profileData.availableDays || [],
        availableSlots: profileData.availableSlots || [],
        availability: profileData.availability || [],
        isApproved: false,
      });
    }

    if (role === "mentor") {
      // Acknowledge to the mentor that their application is pending.
      await sendEmail({
        to: email,
        subject: "Welcome to Karigar — Application Pending Approval",
        template: "registration",
        data: { name, role },
      }).catch(() => {});

      // Notify the admin that a new mentor needs vetting — email + in-app.
      await sendEmail({
        to: ADMIN_EMAIL,
        subject: "New mentor application awaiting approval — Karigar",
        template: "adminNewAccount",
        data: { name, email, role },
      }).catch(() => {});

      const admin = await User.findOne({ role: "admin" });
      if (admin) {
        await Notification.create({
          userId: admin._id,
          title: "New mentor application",
          message: `${name} (${email}) applied to become a mentor. Please review their application.`,
          type: "mentor_approved",
        }).catch(() => {});
      }

      res.status(201).json({
        success: true,
        message: "Application submitted! Your mentor profile is pending admin approval. You'll receive an email once it's activated.",
        data: { pendingApproval: true },
      });
      return;
    }

    // Student: active immediately — issue a token so they're logged straight in.
    await sendEmail({
      to: email,
      subject: "Welcome to Karigar!",
      template: "registration",
      data: { name, role },
    }).catch(() => {});

    const token = generateToken(user._id.toString(), user.role, user.email);
    const refreshToken = generateRefreshToken(user._id.toString());
    res.status(201).json({
      success: true,
      message: "Account created! Welcome to Karigar.",
      data: { user, token, refreshToken, pendingApproval: false },
    });
  } catch (error) {
    next(error);
  }
};

// ── Login ──────────────────────────────────────────────────────
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) throw createError("Email and password are required.", 400);

    const query: Record<string, unknown> = { email: String(email).toLowerCase() };
    if (role) query.role = role;

    const user = await User.findOne(query).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      throw createError("Invalid email or password.", 401);
    }

    if (user.status === "suspended") {
      throw createError("Your account has been suspended. Please contact support.", 403);
    }

    if (user.status === "pending") {
      throw createError("Your account is pending admin approval. You'll be notified by email once it's activated.", 403);
    }

    const token = generateToken(user._id.toString(), user.role, user.email);
    const refreshToken = generateRefreshToken(user._id.toString());
    res.json({ success: true, data: { user, token, refreshToken } });
  } catch (error) {
    next(error);
  }
};

// ── Google Sign-In ─────────────────────────────────────────────
// Verifies the Google ID token, then logs in an existing user or creates a new
// student account (Google sign-up is for students; mentors must apply via the form).
export const googleAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { access_token, credential } = req.body;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) throw createError("Google sign-in is not configured on the server.", 500);

    let email: string | undefined;
    let name: string | undefined;
    let picture: string | undefined;
    let sub: string | undefined;
    let verified: boolean | undefined;

    if (access_token) {
      // Access-token flow (custom button). Verify the token belongs to our app,
      // then read the user's profile.
      try {
        const info = await googleClient.getTokenInfo(access_token);
        if (info.aud !== clientId) throw new Error("aud mismatch");
        email = info.email;
        verified = info.email_verified;
        sub = info.sub;
      } catch {
        throw createError("Invalid or expired Google token.", 401);
      }
      try {
        const profileClient = new OAuth2Client();
        profileClient.setCredentials({ access_token });
        const { data } = await profileClient.request<{ sub?: string; email?: string; email_verified?: boolean; name?: string; picture?: string }>({
          url: "https://www.googleapis.com/oauth2/v3/userinfo",
        });
        name = data.name;
        picture = data.picture;
        sub = sub || data.sub;
        email = email || data.email;
        verified = verified ?? data.email_verified;
      } catch {
        /* profile fetch is best-effort; getTokenInfo already gave us email */
      }
    } else if (credential) {
      // ID-token flow (fallback).
      try {
        const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: clientId });
        const payload = ticket.getPayload();
        email = payload?.email;
        verified = payload?.email_verified;
        name = payload?.name;
        picture = payload?.picture;
        sub = payload?.sub;
      } catch {
        throw createError("Invalid or expired Google credential.", 401);
      }
    } else {
      throw createError("Missing Google token.", 400);
    }

    if (!email || !verified) {
      throw createError("Your Google account email could not be verified.", 401);
    }

    email = email.toLowerCase();
    const user = await User.findOne({ email });

    // Login-only: Google sign-in never creates a new account. The user must
    // already exist (e.g. a mentor who registered with this email).
    if (!user) {
      throw createError("No account exists with this email. Please sign up first.", 404);
    }
    if (user.status === "suspended") throw createError("Your account has been suspended.", 403);
    if (user.status === "pending") throw createError("Your account is pending admin approval.", 403);

    // Link the Google identity on first Google login for an existing account.
    if (!user.googleId) {
      user.googleId = sub;
      if (picture && !user.profilePicture) user.profilePicture = picture;
      await user.save();
    }

    const token = generateToken(user._id.toString(), user.role, user.email);
    const refreshToken = generateRefreshToken(user._id.toString());
    res.json({ success: true, data: { user, token, refreshToken } });
  } catch (error) {
    next(error);
  }
};

// ── Refresh access token ───────────────────────────────────────
// Exchanges a valid refresh token for a fresh 1h access token (and rotates the
// refresh token). Public — no access token required (the old one may be expired).
export const refreshAccessToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken: rt } = req.body;
    if (!rt) throw createError("Missing refresh token.", 400);
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

    let payload: { id: string; type?: string };
    try {
      payload = jwt.verify(String(rt), secret as string) as { id: string; type?: string };
    } catch {
      throw createError("Session expired. Please sign in again.", 401);
    }
    if (payload.type !== "refresh" || !payload.id) throw createError("Invalid refresh token.", 401);

    const user = await User.findById(payload.id);
    if (!user) throw createError("Account no longer exists.", 401);
    if (user.status === "suspended") throw createError("This account has been suspended.", 403);

    const token = generateToken(user._id.toString(), user.role, user.email);
    const newRefresh = generateRefreshToken(user._id.toString());
    res.json({ success: true, data: { token, refreshToken: newRefresh } });
  } catch (error) {
    next(error);
  }
};

// ── Get Current User ───────────────────────────────────────────
export const getMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.user!.id).select("-password");
    if (!user) throw createError("User not found.", 404);

    let profile = null;
    if (user.role === "student") {
      profile = await Student.findOne({ userId: user._id });
    } else if (user.role === "mentor") {
      // Include the mentor's own certificate files + bank accounts so they can manage them.
      profile = await Mentor.findOne({ userId: user._id }).select("+certificateFiles +bankAccounts");
    }

    res.json({ success: true, data: { user, profile } });
  } catch (error) {
    next(error);
  }
};

// ── Update Current User (name / phone / profile picture) ───────
export const updateMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, phone, profilePicture } = req.body;
    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name;
    if (phone !== undefined) update.phone = phone;
    if (profilePicture !== undefined) update.profilePicture = profilePicture;

    const user = await User.findByIdAndUpdate(req.user!.id, update, { new: true }).select("-password");
    if (!user) throw createError("User not found.", 404);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// ── Forgot Password ────────────────────────────────────────────
export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: String(email).toLowerCase() });

    // Always respond with success to prevent email enumeration.
    if (user) {
      const resetToken = uuidv4();
      const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
      await sendEmail({
        to: email,
        subject: "Password Reset - Karigar",
        template: "passwordReset",
        data: { name: user.name, resetUrl },
      }).catch(() => {});
    }

    res.json({
      success: true,
      message: "If this email exists, you will receive a password reset link.",
    });
  } catch (error) {
    next(error);
  }
};

// ── Delete own account (student / mentor) ──────────────────────
// Removes the user's account and profile. Past sessions keep their name
// snapshots so the other party's history stays readable.
export const deleteOwnAccount = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const user = await User.findById(userId);
    if (!user) throw createError("User not found.", 404);
    if (user.role === "admin") throw createError("Admin accounts cannot be self-deleted.", 403);

    await Student.deleteOne({ userId });
    await Mentor.deleteOne({ userId });
    await User.findByIdAndDelete(userId);

    res.json({ success: true, message: "Your account has been deleted." });
  } catch (error) {
    next(error);
  }
};

// ── Logout ─────────────────────────────────────────────────────
export const logout = (_req: Request, res: Response): void => {
  // JWT is stateless; the client simply discards the token.
  res.json({ success: true, message: "Logged out successfully." });
};

// ── Google Calendar: connect ───────────────────────────────────
// Returns the Google consent URL. `state` is a short-lived signed token that
// carries the user's id back to the (unauthenticated) callback.
export const getCalendarAuthUrl = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isCalendarConfigured()) {
      throw createError("Google Calendar is not configured on the server.", 500);
    }
    const state = jwt.sign({ uid: req.user!.id, purpose: "calendar" }, process.env.JWT_SECRET as string, {
      expiresIn: "10m",
    });
    res.json({ success: true, data: { url: buildCalendarAuthUrl(state) } });
  } catch (error) {
    next(error);
  }
};

// ── Google Calendar: OAuth callback (public — Google redirects here) ──
// Exchanges the code for a refresh token and stores it on the user, then
// redirects back to the app's profile page.
export const calendarCallback = async (req: Request, res: Response): Promise<void> => {
  const clientBase = (process.env.CLIENT_URL || "http://localhost:8080").split(",")[0].trim();
  const fail = (where = "/student-profile") => res.redirect(`${clientBase}${where}?calendar=error`);

  try {
    const { code, state, error } = req.query as { code?: string; state?: string; error?: string };
    if (error || !code || !state) return fail();

    let uid: string;
    try {
      const decoded = jwt.verify(String(state), process.env.JWT_SECRET as string) as { uid: string; purpose?: string };
      if (decoded.purpose !== "calendar" || !decoded.uid) return fail();
      uid = decoded.uid;
    } catch {
      return fail();
    }

    const user = await User.findById(uid);
    if (!user) return fail();

    const { refreshToken, email } = await exchangeCalendarCode(String(code));
    const dest = user.role === "mentor" ? "/mentor-profile-edit" : "/student-profile";

    if (!refreshToken) {
      // Google only returns a refresh token on first consent. We force prompt=consent,
      // so this is rare — but guard anyway.
      return res.redirect(`${clientBase}${dest}?calendar=error`);
    }

    user.googleCalendar = {
      connected: true,
      refreshToken,
      email: email || user.googleCalendar?.email,
      connectedAt: new Date(),
    };
    await user.save();

    res.redirect(`${clientBase}${dest}?calendar=connected`);
  } catch {
    fail();
  }
};

// ── Google Calendar: disconnect ────────────────────────────────
export const disconnectCalendar = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.user!.id);
    if (!user) throw createError("User not found.", 404);
    user.googleCalendar = { connected: false };
    await user.save();
    res.json({ success: true, message: "Google Calendar disconnected." });
  } catch (error) {
    next(error);
  }
};
