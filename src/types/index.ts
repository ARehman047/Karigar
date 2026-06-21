// ─── Roles ────────────────────────────────────────────────────────────────────
export type UserRole = "student" | "mentor" | "admin";

// ─── Core User ────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  city?: string;
  country?: string;
  timezone?: string;
  status: "active" | "suspended" | "pending";
  createdAt: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface AuthUser extends User {
  token?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  role: UserRole;
  rememberMe?: boolean;
}

export interface RegisterStudentData {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  dateOfBirth: string;
  gender: string;
  country: string;
  city: string;
  educationLevel: string;
  institution: string;
  fieldOfStudy: string;
  careerGoals: string;
  interests: string[];
  preferredMentorCategories: string[];
  bio: string;
  linkedin?: string;
  github?: string;
  timezone: string;
}

export interface RegisterMentorData {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  dateOfBirth: string;
  gender: string;
  country: string;
  city: string;
  education: string;
  university: string;
  designation: string;
  company: string;
  yearsOfExperience: number;
  specialization: string;
  subjects: string[];
  skills: string[];
  languages: string[];
  hourlyRate: number;
  bio: string;
  achievements: string;
  certifications: string;
  linkedin?: string;
  github?: string;
  timezone: string;
  availableDays: string[];
  availableSlots: string[];
}

// ─── Student ──────────────────────────────────────────────────────────────────
export interface Student {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  university: string;
  field: string;
  educationLevel: string;
  degree?: string;
  year?: number;
  gpa?: number;
  interests: string[];
  preferredMentorCategories: string[];
  careerGoals: string;
  bio: string;
  avatar?: string;
  linkedin?: string;
  github?: string;
  timezone: string;
  status: "active" | "suspended" | "pending";
  createdAt: string;
}

// ─── Mentor ───────────────────────────────────────────────────────────────────
export interface Mentor {
  id: string;
  userId?: string;
  name: string;
  email?: string;
  title: string;
  type: "academic" | "industry";
  expertise: string[];
  field: string;
  rating: number;
  sessionsCount: number;
  avatar?: string;
  bio?: string;
  qualification?: string;
  phone: string;
  city: string;
  country?: string;
  university?: string;
  company?: string;
  hourlyRate: number;
  availability: string[];
  availableDays?: string[];
  skills?: string[];
  languages?: string[];
  yearsOfExperience?: number;
  achievements?: string;
  certifications?: string;
  timezone?: string;
  status: "active" | "suspended" | "pending" | "approved";
  isApproved: boolean;
  badge?: "none" | "silver" | "gold";
  specialities?: string[];
  createdAt?: string;
}

// ─── Session ──────────────────────────────────────────────────────────────────
export type SessionStatus =
  | "PENDING_PAYMENT"
  | "PENDING_ADMIN_CONFIRMATION"
  | "PENDING_MENTOR_PAYOUT"
  | "PENDING_MENTOR_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "RESCHEDULE_REQUESTED"
  | "COMPLETED"
  | "CANCELLED";

export interface Session {
  id: string;
  studentId: string;
  mentorId: string;
  mentorName: string;
  studentName: string;
  studentRemoved?: boolean; // the student's account was deleted
  mentorRemoved?: boolean; // the mentor's account was deleted
  studentEmail?: string;
  mentorEmail?: string;
  date: string;
  time: string;
  duration: number; // in minutes
  status: SessionStatus;
  topic: string;
  type: "video" | "chat" | "in-person";
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

// ─── Payment ──────────────────────────────────────────────────────────────────
export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED";

export interface Payment {
  id: string;
  sessionId: string;
  studentId: string;
  mentorId: string;
  studentName: string;
  mentorName: string;
  packageName?: string; // service / session type
  amount: number;
  status: PaymentStatus;
  transactionId?: string;
  studentPaidAt?: string;
  paidAt?: string;
  createdAt: string;
}

// ─── Notification ─────────────────────────────────────────────────────────────
export type NotificationType =
  | "booking_created"
  | "payment_approved"
  | "session_approved"
  | "session_rejected"
  | "session_reminder"
  | "session_cancelled"
  | "new_message"
  | "mentor_approved";

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  sessionId?: string;
  createdAt: string;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  sessionId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  attachments?: string[];
  timestamp: string;
}

// ─── Assessment ───────────────────────────────────────────────────────────────
export interface Assessment {
  id: string;
  userId: string;
  type: "skills" | "career" | "personality";
  score: number;
  completedAt: string;
  results: AssessmentResult[];
}

export interface AssessmentResult {
  category: string;
  score: number;
  insights: string[];
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
export interface DashboardStats {
  upcomingSessions: number;
  completedSessions: number;
  assessmentScore: number;
  recommendedMentors: number;
}

export interface AdminStats {
  totalStudents: number;
  totalMentors: number;
  totalSessions: number;
  upcomingSessions: number;
  completedSessions: number;
  pendingPayments: number;
  totalRevenue: number;
  pendingMentorApprovals: number;
}

// ─── Payment Plan ─────────────────────────────────────────────────────────────
export interface PaymentPlan {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  popular: boolean;
  icon: string;
}

// ─── Shared ───────────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
