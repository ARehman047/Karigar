import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Public pages
import Index from "./pages/Index";
import About from "./pages/About";
import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";

// Shared pages
import Mentors from "./pages/Mentors";
import MentorProfile from "./pages/MentorProfile";

// Student pages
import Dashboard from "./pages/Dashboard";
import BookSession from "./pages/BookSession";
import Sessions from "./pages/Sessions";
import Assessments from "./pages/Assessments";
import Billing from "./pages/Billing";
import NotificationsPage from "./pages/Notifications";
import PaymentPage from "./pages/Payment";
import SessionRoom from "./pages/SessionRoom";
import SessionCall from "./pages/SessionCall";

// Mentor pages
import MentorDashboard from "./pages/MentorDashboard";
import MentorAppointments from "./pages/MentorAppointments";
import MentorProfileEdit from "./pages/MentorProfileEdit";

// Admin pages
import AdminDashboard from "./pages/AdminDashboard";
import AdminEditUser from "./pages/AdminEditUser";
import Students from "./pages/Students";
import ForgotPassword from "./pages/ForgotPassword";

// Profile pages
import StudentProfile from "./pages/StudentProfile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* ── Public ────────────────────────────────────── */}
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/mentors" element={<Mentors />} />
            <Route path="/mentor/:mentorId" element={<MentorProfile />} />

            {/* ── Student ───────────────────────────────────── */}
            <Route path="/dashboard" element={
              <ProtectedRoute allowedRoles={["student"]}>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/book/:mentorId" element={
              <ProtectedRoute allowedRoles={["student"]}>
                <BookSession />
              </ProtectedRoute>
            } />
            <Route path="/payment/:sessionId" element={
              <ProtectedRoute allowedRoles={["student"]}>
                <PaymentPage />
              </ProtectedRoute>
            } />
            <Route path="/student-profile" element={
              <ProtectedRoute allowedRoles={["student"]}>
                <StudentProfile />
              </ProtectedRoute>
            } />

            {/* ── Mentor ────────────────────────────────────── */}
            <Route path="/mentor-dashboard" element={
              <ProtectedRoute allowedRoles={["mentor"]}>
                <MentorDashboard />
              </ProtectedRoute>
            } />
            <Route path="/appointments" element={
              <ProtectedRoute allowedRoles={["mentor"]}>
                <MentorAppointments />
              </ProtectedRoute>
            } />
            <Route path="/mentor-profile-edit" element={
              <ProtectedRoute allowedRoles={["mentor"]}>
                <MentorProfileEdit />
              </ProtectedRoute>
            } />

            {/* ── Admin ─────────────────────────────────────── */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/students" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Students />
              </ProtectedRoute>
            } />
            <Route path="/admin/users/:userId/edit" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminEditUser />
              </ProtectedRoute>
            } />

            {/* ── Shared (authenticated) ────────────────────── */}
            <Route path="/sessions" element={
              <ProtectedRoute>
                <Sessions />
              </ProtectedRoute>
            } />
            <Route path="/session/:sessionId" element={
              <ProtectedRoute>
                <SessionRoom />
              </ProtectedRoute>
            } />
            <Route path="/session/:sessionId/call" element={
              <ProtectedRoute>
                <SessionCall />
              </ProtectedRoute>
            } />
            <Route path="/notifications" element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            } />
            <Route path="/assessments" element={
              <ProtectedRoute>
                <Assessments />
              </ProtectedRoute>
            } />
            <Route path="/billing" element={
              <ProtectedRoute>
                <Billing />
              </ProtectedRoute>
            } />

            {/* ── Fallback ──────────────────────────────────── */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
