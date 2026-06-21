import { api } from "./api";
import type {
  Mentor,
  Session,
  Notification,
  Payment,
  Student,
  AdminStats,
  UserRole,
} from "@/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────
type Ref = string | { _id?: string; id?: string; name?: string; email?: string; profilePicture?: string } | null | undefined;

const refId = (ref: Ref): string => {
  if (!ref) return "";
  if (typeof ref === "string") return ref;
  return ref._id || ref.id || "";
};
const refName = (ref: Ref): string => (ref && typeof ref === "object" ? ref.name || "" : "");
const refEmail = (ref: Ref): string => (ref && typeof ref === "object" ? ref.email || "" : "");

// ─── Auth user ───────────────────────────────────────────────────────────────
export interface BackendUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "active" | "suspended" | "pending";
  phone?: string;
  profilePicture?: string;
  createdAt?: string;
  googleCalendar?: { connected?: boolean; email?: string };
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status?: string;
  avatar?: string;
  phone?: string;
  token?: string;
  calendarConnected?: boolean;
  calendarEmail?: string;
}

export const normalizeUser = (u: BackendUser, token?: string): AuthUser => ({
  id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  status: u.status,
  avatar: u.profilePicture,
  phone: u.phone,
  token,
  calendarConnected: !!u.googleCalendar?.connected,
  calendarEmail: u.googleCalendar?.email,
});

// ─── Mentor ──────────────────────────────────────────────────────────────────
interface BackendMentor {
  _id: string;
  userId: Ref;
  type: "academic" | "industry";
  field: string;
  expertise?: string[];
  title?: string;
  qualification?: string;
  specialization?: string;
  subjects?: string[];
  skills?: string[];
  languages?: string[];
  city?: string;
  country?: string;
  company?: string;
  university?: string;
  designation?: string;
  education?: string;
  yearsOfExperience?: number;
  hourlyRate: number;
  bio?: string;
  achievements?: string;
  certifications?: string;
  availableDays?: string[];
  availableSlots?: string[];
  availability?: string[];
  rating: number;
  sessionsCount: number;
  isApproved: boolean;
  badge?: "none" | "silver" | "gold";
  specialities?: string[];
  phone?: string;
  timezone?: string;
  linkedin?: string;
  github?: string;
  createdAt?: string;
}

export const normalizeMentor = (m: BackendMentor): Mentor => ({
  id: m._id,
  userId: refId(m.userId),
  name: refName(m.userId) || "Mentor",
  email: refEmail(m.userId),
  title: m.title || m.designation || "",
  type: m.type,
  expertise: m.expertise?.length ? m.expertise : m.skills || [],
  field: m.field,
  rating: m.rating ?? 0,
  sessionsCount: m.sessionsCount ?? 0,
  avatar: (typeof m.userId === "object" && m.userId?.profilePicture) || undefined,
  bio: m.bio,
  qualification: m.qualification || m.education,
  phone: m.phone || "",
  city: m.city || "",
  country: m.country,
  university: m.university,
  company: m.company,
  hourlyRate: m.hourlyRate,
  availability: m.availability?.length ? m.availability : m.availableSlots || [],
  availableDays: m.availableDays,
  skills: m.skills,
  languages: m.languages,
  yearsOfExperience: m.yearsOfExperience,
  achievements: m.achievements,
  certifications: m.certifications,
  timezone: m.timezone,
  status: m.isApproved ? "approved" : "pending",
  isApproved: m.isApproved,
  badge: m.badge || "none",
  specialities: m.specialities || [],
  createdAt: m.createdAt,
});

// ─── Session ─────────────────────────────────────────────────────────────────
interface BackendSession {
  _id: string;
  studentId: Ref;
  mentorId: Ref;
  studentName?: string; // snapshot (survives account deletion)
  mentorName?: string;
  date: string;
  time: string;
  duration: number;
  status: Session["status"];
  topic: string;
  type: Session["type"];
  packageName?: string;
  message?: string;
  notes?: string;
  meetingLink?: string;
  roomId?: string;
  amount: number;
  paymentId?: string;
  rejectionReason?: string;
  rescheduleReason?: string;
  proposedDate?: string;
  proposedTime?: string;
  rescheduleRequestedBy?: "mentor" | "student";
  reviewed?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export const normalizeSession = (s: BackendSession): Session => ({
  id: s._id,
  studentId: refId(s.studentId),
  mentorId: refId(s.mentorId),
  // Prefer the live populated name; fall back to the stored snapshot if the
  // account was deleted. `*Removed` is true when the ref is gone but we have a snapshot.
  studentName: refName(s.studentId) || s.studentName || "",
  mentorName: refName(s.mentorId) || s.mentorName || "",
  studentRemoved: !refId(s.studentId) && !!s.studentName,
  mentorRemoved: !refId(s.mentorId) && !!s.mentorName,
  studentEmail: refEmail(s.studentId),
  mentorEmail: refEmail(s.mentorId),
  date: s.date,
  time: s.time,
  duration: s.duration,
  status: s.status,
  topic: s.topic,
  type: s.type,
  packageName: s.packageName,
  message: s.message,
  notes: s.notes,
  meetingLink: s.meetingLink,
  roomId: s.roomId,
  amount: s.amount,
  paymentId: s.paymentId,
  rejectionReason: s.rejectionReason,
  rescheduleReason: s.rescheduleReason,
  proposedDate: s.proposedDate,
  proposedTime: s.proposedTime,
  rescheduleRequestedBy: s.rescheduleRequestedBy,
  reviewed: s.reviewed,
  createdAt: s.createdAt,
  updatedAt: s.updatedAt,
});

// ─── Notification ────────────────────────────────────────────────────────────
interface BackendNotification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: Notification["type"];
  isRead: boolean;
  sessionId?: string;
  createdAt: string;
}

export const normalizeNotification = (n: BackendNotification): Notification => ({
  id: n._id,
  userId: refId(n.userId),
  title: n.title,
  message: n.message,
  type: n.type,
  isRead: n.isRead,
  sessionId: n.sessionId,
  createdAt: n.createdAt,
});

// ─── Payment ─────────────────────────────────────────────────────────────────
interface BackendPayment {
  _id: string;
  sessionId: Ref & { packageName?: string; type?: string };
  studentId: Ref;
  mentorId: Ref;
  amount: number;
  status: Payment["status"];
  transactionId?: string;
  studentPaidAt?: string;
  paidAt?: string;
  createdAt: string;
}

export const normalizePayment = (p: BackendPayment): Payment => ({
  id: p._id,
  sessionId: refId(p.sessionId),
  studentId: refId(p.studentId),
  mentorId: refId(p.mentorId),
  studentName: refName(p.studentId),
  mentorName: refName(p.mentorId),
  packageName: (p.sessionId && typeof p.sessionId === "object" ? p.sessionId.packageName : undefined) || undefined,
  amount: p.amount,
  status: p.status,
  transactionId: p.transactionId,
  studentPaidAt: p.studentPaidAt,
  paidAt: p.paidAt,
  createdAt: p.createdAt,
});

// ─── Student ─────────────────────────────────────────────────────────────────
interface BackendStudent {
  _id: string;
  userId: Ref;
  phone?: string;
  city?: string;
  country?: string;
  institution?: string;
  fieldOfStudy?: string;
  educationLevel?: string;
  interests?: string[];
  preferredMentorType?: "academic" | "industry" | "both";
  preferredFields?: string[];
  preferredMentorCategories?: string[];
  careerGoals?: string;
  bio?: string;
  linkedin?: string;
  github?: string;
  timezone?: string;
  createdAt?: string;
}

export const normalizeStudent = (s: BackendStudent): Student => ({
  id: s._id,
  userId: refId(s.userId),
  name: refName(s.userId),
  email: refEmail(s.userId),
  phone: s.phone || "",
  city: s.city || "",
  country: s.country || "Pakistan",
  university: s.institution || "",
  field: s.fieldOfStudy || "",
  educationLevel: s.educationLevel || "",
  interests: s.interests || [],
  preferredMentorCategories: s.preferredMentorCategories || [],
  careerGoals: s.careerGoals || "",
  bio: s.bio || "",
  linkedin: s.linkedin,
  github: s.github,
  timezone: s.timezone || "Asia/Karachi",
  status: "active",
  createdAt: s.createdAt || "",
});

// ─── Student preferences (kept raw for filtering) ────────────────────────────
export interface StudentPrefs {
  preferredMentorType: "academic" | "industry" | "both";
  preferredFields: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
//  API surface
// ═══════════════════════════════════════════════════════════════════════════════

export const authApi = {
  login: async (email: string, password: string, role?: UserRole) => {
    const res = await api.post<{ user: BackendUser; token: string; refreshToken?: string }>("/auth/login", { email, password, role }, false);
    return { user: normalizeUser(res.data.user, res.data.token), token: res.data.token, refreshToken: res.data.refreshToken };
  },
  google: async (accessToken: string) => {
    const res = await api.post<{ user: BackendUser; token: string; refreshToken?: string }>("/auth/google", { access_token: accessToken }, false);
    return { user: normalizeUser(res.data.user, res.data.token), token: res.data.token, refreshToken: res.data.refreshToken };
  },
  register: async (data: Record<string, unknown>, role: UserRole) => {
    const res = await api.post<{ pendingApproval?: boolean; user?: BackendUser; token?: string; refreshToken?: string }>(
      "/auth/register",
      { ...data, role },
      false
    );
    const out = {
      message: res.message,
      pendingApproval: res.data?.pendingApproval ?? true,
      user: res.data?.user ? normalizeUser(res.data.user, res.data.token) : undefined,
      token: res.data?.token,
      refreshToken: res.data?.refreshToken,
    };
    return out;
  },
  me: async () => {
    const res = await api.get<{ user: BackendUser; profile: BackendStudent | BackendMentor | null }>("/auth/me");
    return { user: normalizeUser(res.data.user), profile: res.data.profile };
  },
  updateMe: async (data: { name?: string; phone?: string; profilePicture?: string }) => {
    const res = await api.put<BackendUser>("/auth/me", data);
    return normalizeUser(res.data);
  },
  forgotPassword: (email: string) => api.post("/auth/forgot-password", { email }, false),
  logout: () => api.post("/auth/logout"),
  deleteAccount: () => api.del("/auth/me"),
  // Google Calendar connect: returns the Google consent URL to redirect to.
  getCalendarConnectUrl: async () => {
    const res = await api.get<{ url: string }>("/auth/google/calendar/url");
    return res.data.url;
  },
  disconnectCalendar: () => api.del("/auth/google/calendar"),
  sendOtp: async (email: string) => {
    const res = await api.post<{ devCode?: string }>("/auth/send-otp", { email }, false);
    return { message: res.message, devCode: res.data?.devCode };
  },
  verifyOtp: async (email: string, code: string) => {
    const res = await api.post<{ emailVerificationToken: string }>("/auth/verify-otp", { email, code }, false);
    return res.data.emailVerificationToken;
  },
};

export const mentorApi = {
  list: async (params: { type?: string; field?: string; city?: string; search?: string; badge?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.type && params.type !== "all") qs.set("type", params.type);
    if (params.field && params.field !== "all") qs.set("field", params.field);
    if (params.city && params.city !== "all") qs.set("city", params.city);
    if (params.search) qs.set("search", params.search);
    if (params.badge && params.badge !== "all") qs.set("badge", params.badge);
    const res = await api.get<BackendMentor[]>(`/mentors${qs.toString() ? `?${qs}` : ""}`, false);
    return res.data.map(normalizeMentor);
  },
  get: async (id: string) => {
    const res = await api.get<BackendMentor>(`/mentors/${id}`, false);
    return normalizeMentor(res.data);
  },
  getReviews: async (id: string): Promise<MentorReview[]> => {
    const res = await api.get<Array<{ _id: string; studentId: Ref; rating: number; comment?: string; createdAt: string }>>(
      `/mentors/${id}/reviews`,
      false
    );
    return res.data.map((r) => ({
      id: r._id,
      studentName: refName(r.studentId) || "Student",
      studentAvatar: (typeof r.studentId === "object" && r.studentId?.profilePicture) || undefined,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
    }));
  },
  // The logged-in mentor's own reviews.
  getMyReviews: async (): Promise<MentorReview[]> => {
    const res = await api.get<Array<{ _id: string; studentId: Ref; rating: number; comment?: string; createdAt: string }>>(
      "/mentors/me/reviews"
    );
    return res.data.map((r) => ({
      id: r._id,
      studentName: refName(r.studentId) || "Student",
      studentAvatar: (typeof r.studentId === "object" && r.studentId?.profilePicture) || undefined,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
    }));
  },
  update: async (id: string, data: Record<string, unknown>) => {
    const res = await api.put<BackendMentor>(`/mentors/${id}`, data);
    return normalizeMentor(res.data);
  },
};

export interface MentorReview {
  id: string;
  studentName: string;
  studentAvatar?: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export const sessionApi = {
  list: async (status?: string) => {
    const res = await api.get<BackendSession[]>(`/sessions${status ? `?status=${status}` : ""}`);
    return res.data.map(normalizeSession);
  },
  get: async (id: string) => {
    const res = await api.get<BackendSession>(`/sessions/${id}`);
    return normalizeSession(res.data);
  },
  // Student cancels their own unpaid (PENDING_PAYMENT) session.
  cancel: (id: string) => api.del(`/sessions/${id}`),
  create: async (data: {
    mentorId: string; // mentor USER id
    date: string;
    time: string;
    duration?: number;
    topic: string;
    type?: string;
    message?: string;
    amount?: number;
    packageName?: string;
  }) => {
    const res = await api.post<BackendSession>("/sessions", data);
    return normalizeSession(res.data);
  },
  updateStatus: async (id: string, action: "approve" | "reject", reason?: string) => {
    const res = await api.put<BackendSession>(`/sessions/${id}/status`, { action, reason });
    return normalizeSession(res.data);
  },
  requestReschedule: async (id: string, data: { proposedDate: string; proposedTime: string; reason: string }) => {
    const res = await api.put<BackendSession>(`/sessions/${id}/reschedule`, data);
    return normalizeSession(res.data);
  },
  respondReschedule: async (id: string, accept: boolean) => {
    const res = await api.put<BackendSession>(`/sessions/${id}/reschedule-response`, { accept });
    return normalizeSession(res.data);
  },
  submitReview: async (id: string, rating: number, comment: string) => {
    const res = await api.post<BackendSession>(`/sessions/${id}/review`, { rating, comment });
    return normalizeSession(res.data);
  },
  getCallConfig: async (id: string) => {
    const res = await api.get<{ provider: string; domain: string; appId: string | null; room: string; token: string | null }>(
      `/sessions/${id}/call-config`
    );
    return res.data;
  },
  getReview: async (id: string) => {
    const res = await api.get<{ rating: number; comment: string; studentName: string; createdAt: string } | null>(
      `/sessions/${id}/review`
    );
    return res.data;
  },
  // In-call document sharing
  listFiles: async (id: string): Promise<SharedFileMeta[]> => {
    const res = await api.get<SharedFileMeta[]>(`/sessions/${id}/files`);
    return res.data;
  },
  uploadFile: async (
    id: string,
    file: { name: string; mimeType: string; size: number; data: string }
  ): Promise<SharedFileMeta> => {
    const res = await api.post<SharedFileMeta>(`/sessions/${id}/files`, file);
    return res.data;
  },
  getFile: async (
    id: string,
    fileId: string
  ): Promise<{ name: string; mimeType: string; size: number; data: string }> => {
    const res = await api.get<{ name: string; mimeType: string; size: number; data: string }>(
      `/sessions/${id}/files/${fileId}`
    );
    return res.data;
  },
};

export interface SharedFileMeta {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  uploaderId: string;
  uploaderName: string;
  createdAt: string;
}

export interface BankAccount {
  bankName: string;
  accountTitle: string;
  accountNumber: string;
  iban: string;
}

export interface BankDetails {
  accounts: BankAccount[];
  note: string;
}

export const paymentApi = {
  initiate: async (sessionId: string) => {
    const res = await api.post<{ payment: BackendPayment; sessionAmount: number }>("/payments/initiate", { sessionId });
    return { payment: normalizePayment(res.data.payment), sessionAmount: res.data.sessionAmount };
  },
  // Student submits a bank-transfer receipt (base64 data URL) for admin verification.
  process: async (sessionId: string, receipt: string) => {
    const res = await api.post<BackendPayment>("/payments/process", { sessionId, receipt });
    return normalizePayment(res.data);
  },
  getBankDetails: async () => {
    const res = await api.get<BankDetails>("/payments/bank-details");
    return res.data;
  },
  getReceipt: async (paymentId: string) => {
    const res = await api.get<{ receiptImage: string | null }>(`/payments/${paymentId}/receipt`);
    return res.data.receiptImage;
  },
  confirm: async (paymentId: string) => {
    const res = await api.put<BackendPayment>(`/payments/${paymentId}/confirm`);
    return normalizePayment(res.data);
  },
  // Admin mentor-payout flow
  listPayouts: async (): Promise<PayoutRow[]> => {
    const res = await api.get<PayoutRow[]>("/payments/payouts");
    return res.data;
  },
  sendPayout: (paymentId: string, receipt: string) => api.put(`/payments/${paymentId}/payout`, { receipt }),
  payoutHistory: async (): Promise<PayoutHistoryRow[]> => {
    const res = await api.get<PayoutHistoryRow[]>("/payments/payouts/history");
    return res.data;
  },
  getPayoutReceipt: async (paymentId: string) => {
    const res = await api.get<{ receiptImage: string | null }>(`/payments/${paymentId}/payout-receipt`);
    return res.data.receiptImage;
  },
};

export interface PayoutBankAccount {
  bankName: string;
  accountTitle: string;
  accountNumber: string;
  iban?: string;
}

export interface PayoutHistoryRow {
  paymentId: string;
  studentName: string;
  mentorName: string;
  topic: string;
  packageName: string;
  date: string;
  amount: number;
  paidAt: string;
}

export interface PayoutRow {
  sessionId: string;
  paymentId: string | null;
  topic: string;
  packageName: string;
  date: string;
  time: string;
  amount: number;
  mentorPayout: number;
  studentName: string;
  mentorName: string;
  sessionStatus: string;
  canPay: boolean;
  payoutDone: boolean;
  mentorBankAccounts: PayoutBankAccount[];
}

export const notificationApi = {
  list: async () => {
    const res = await api.get<BackendNotification[]>("/notifications");
    return res.data.map(normalizeNotification);
  },
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put("/notifications/read-all"),
  remove: (id: string) => api.del(`/notifications/${id}`),
};

export const studentApi = {
  get: async (id: string) => {
    const res = await api.get<BackendStudent>(`/students/${id}`);
    return normalizeStudent(res.data);
  },
  update: async (id: string, data: Record<string, unknown>) => {
    const res = await api.put<BackendStudent>(`/students/${id}`, data);
    return normalizeStudent(res.data);
  },
};

export const adminApi = {
  stats: async () => {
    const res = await api.get<AdminStats & { pendingApprovals: number; pendingStudentApprovals: number }>("/admin/stats");
    return res.data;
  },
  users: async (params: { role?: string; status?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.role) qs.set("role", params.role);
    if (params.status) qs.set("status", params.status);
    const res = await api.get<BackendUser[]>(`/admin/users${qs.toString() ? `?${qs}` : ""}`);
    return res.data;
  },
  pending: async () => {
    const res = await api.get<BackendUser[]>("/admin/pending");
    return res.data;
  },
  mentors: async () => {
    const res = await api.get<BackendMentor[]>("/admin/mentors");
    return res.data.map(normalizeMentor);
  },
  getMentorCertificates: async (mentorId: string) => {
    const res = await api.get<{ name: string; data: string }[]>(`/admin/mentors/${mentorId}/certificates`);
    return res.data;
  },
  getUserFull: async (userId: string) => {
    const res = await api.get<{ user: BackendUser; profile: Record<string, unknown> | null }>(`/admin/users/${userId}/full`);
    return res.data;
  },
  updateUserFull: (userId: string, body: { user?: Record<string, unknown>; profile?: Record<string, unknown> }) =>
    api.put(`/admin/users/${userId}/full`, body),
  students: async () => {
    const res = await api.get<BackendStudent[]>("/admin/students");
    return res.data.map(normalizeStudent);
  },
  sessions: async () => {
    const res = await api.get<BackendSession[]>("/admin/sessions");
    return res.data.map(normalizeSession);
  },
  payments: async () => {
    const res = await api.get<BackendPayment[]>("/admin/payments");
    return res.data.map(normalizePayment);
  },
  updateUser: (userId: string, data: { name?: string; email?: string; phone?: string }) => api.put(`/admin/users/${userId}`, data),
  approveUser: (userId: string) => api.put(`/admin/users/${userId}/approve`),
  rejectUser: (userId: string, reason?: string) => api.put(`/admin/users/${userId}/reject`, { reason }),
  setUserStatus: (userId: string, status: "active" | "suspended") => api.put(`/admin/users/${userId}/status`, { status }),
  deleteUser: (userId: string) => api.del(`/admin/users/${userId}`),
  cancelSession: (sessionId: string) => api.put(`/admin/sessions/${sessionId}/cancel`),
  deleteSession: (sessionId: string) => api.del(`/admin/sessions/${sessionId}`),
  confirmPayment: (paymentId: string) => api.put(`/payments/${paymentId}/confirm`),
  declinePayment: (paymentId: string, reason: string) => api.put(`/payments/${paymentId}/decline`, { reason }),
};

// ─── Badges ──────────────────────────────────────────────────────────────────
export type BadgeTier = "silver" | "gold";

export interface MyBadgeStatus {
  badge: "none" | BadgeTier;
  completedSessions: number;
  pendingRequest: { id: string; badge: BadgeTier; source: string; createdAt: string } | null;
  eligibility: { silver: boolean; gold: boolean };
  rules: { silver: { threshold: number; fee: number }; gold: { threshold: number; fee: number } };
}

export interface BadgeRequestRow {
  id: string;
  badge: BadgeTier;
  source: "eligibility" | "application" | "admin";
  status: "pending" | "approved" | "declined";
  fee?: number;
  hasReceipt: boolean;
  createdAt: string;
  declineReason?: string;
  mentor: {
    userId: string;
    profileId?: string;
    name: string;
    email: string;
    currentBadge: "none" | BadgeTier;
    rating: number;
    completed: number;
    rejected: number;
    cancelled: number;
    pending: number;
    total: number;
    reviewsCount: number;
  };
}

export const badgeApi = {
  // Mentor
  getMine: async (): Promise<MyBadgeStatus> => {
    const res = await api.get<MyBadgeStatus>("/badges/me");
    return res.data;
  },
  apply: (badge: BadgeTier, receipt: string) => api.post("/badges/apply", { badge, receipt }),
  // Admin
  listRequests: async (status: "pending" | "all" = "pending"): Promise<BadgeRequestRow[]> => {
    const res = await api.get<BadgeRequestRow[]>(`/badges/requests?status=${status}`);
    return res.data;
  },
  getReceipt: async (requestId: string) => {
    const res = await api.get<{ receiptImage: string | null }>(`/badges/requests/${requestId}/receipt`);
    return res.data.receiptImage;
  },
  approve: (requestId: string) => api.put(`/badges/requests/${requestId}/approve`),
  decline: (requestId: string, reason: string) => api.put(`/badges/requests/${requestId}/decline`, { reason }),
  grant: (mentorProfileId: string, badge: "none" | BadgeTier) => api.put(`/badges/mentors/${mentorProfileId}/grant`, { badge }),
};
