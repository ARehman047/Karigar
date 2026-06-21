import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  GraduationCap, Briefcase, TrendingUp, Calendar,
  XCircle, Search, Eye, Trash2, CheckCircle2, UserCheck, Loader2, AlertCircle, Pencil, FileText,
} from "lucide-react";
import { adminApi, paymentApi } from "@/lib/services";
import { AdminBadgesTab } from "@/components/admin/AdminBadgesTab";
import { AdminPayoutsTab } from "@/components/admin/AdminPayoutsTab";
import { openDataUrl } from "@/lib/file";
import { formatTime12h } from "@/lib/session";
import type { Session, Payment, Student, Mentor } from "@/types";
import type { BackendUser } from "@/lib/services";
import { Link, useNavigate } from "react-router-dom";

const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: "bg-yellow-100 text-yellow-700",
  PENDING_ADMIN_CONFIRMATION: "bg-amber-100 text-amber-700",
  PENDING_MENTOR_PAYOUT: "bg-amber-100 text-amber-700",
  PENDING_MENTOR_APPROVAL: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  RESCHEDULE_REQUESTED: "bg-orange-100 text-orange-700",
  COMPLETED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-50 text-red-400",
  PENDING: "bg-yellow-100 text-yellow-700",
  SUCCESS: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
};

interface AdminStatsShape {
  totalStudents: number;
  totalMentors: number;
  totalSessions: number;
  upcomingSessions: number;
  completedSessions: number;
  pendingPayments: number;
  totalRevenue: number;
  pendingMentorApprovals: number;
  pendingStudentApprovals: number;
  pendingApprovals: number;
}

const AdminDashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStatsShape | null>(null);
  const [pending, setPending] = useState<BackendUser[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [studentsState, setStudentsState] = useState<Student[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [sessionSearch, setSessionSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [mentorSearch, setMentorSearch] = useState("");
  const [paySearch, setPaySearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  // Review-application dialog
  const [reviewUser, setReviewUser] = useState<BackendUser | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [reviewCerts, setReviewCerts] = useState<{ name: string; data: string }[]>([]);
  const [certsLoading, setCertsLoading] = useState(false);
  const [payDeclineId, setPayDeclineId] = useState<string | null>(null);
  const [payDeclineReason, setPayDeclineReason] = useState("");

  // Edit opens the full admin profile editor page.
  const openEditMentor = (m: Mentor) => navigate(`/admin/users/${m.userId}/edit`);
  const openEditStudent = (s: Student) => navigate(`/admin/users/${s.userId}/edit`);

  const loadAll = useCallback(async () => {
    try {
      const [s, p, sess, pay, studs, ments] = await Promise.all([
        adminApi.stats(),
        adminApi.pending(),
        adminApi.sessions(),
        adminApi.payments(),
        adminApi.students(),
        adminApi.mentors(),
      ]);
      setStats(s as AdminStatsShape);
      setPending(p);
      setSessions(sess);
      setPayments(pay);
      setStudentsState(studs);
      setMentors(ments);
    } catch (err) {
      toast({ title: "Couldn't load dashboard", description: (err as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Load the reviewed mentor's certificate PDFs when the review dialog opens.
  useEffect(() => {
    if (!reviewUser) {
      setReviewCerts([]);
      return;
    }
    const m = mentors.find((x) => x.userId === reviewUser._id);
    if (!m) {
      setReviewCerts([]);
      return;
    }
    let active = true;
    setCertsLoading(true);
    adminApi
      .getMentorCertificates(m.id)
      .then((c) => active && setReviewCerts(c))
      .catch(() => active && setReviewCerts([]))
      .finally(() => active && setCertsLoading(false));
    return () => {
      active = false;
    };
  }, [reviewUser, mentors]);

  const handleApprove = async (u: BackendUser) => {
    setBusyId(u._id);
    try {
      await adminApi.approveUser(u._id);
      setPending((prev) => prev.filter((x) => x._id !== u._id));
      toast({ title: "Account approved", description: `${u.name} has been activated and notified by email.` });
      setReviewUser(null);
      loadAll();
    } catch (err) {
      toast({ title: "Approval failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (u: BackendUser, reason: string) => {
    if (!reason.trim()) {
      toast({ title: "Reason required", description: "Please provide a reason — it will be emailed to the applicant.", variant: "destructive" });
      return;
    }
    setBusyId(u._id);
    try {
      await adminApi.rejectUser(u._id, reason.trim());
      setPending((prev) => prev.filter((x) => x._id !== u._id));
      toast({ title: "Application declined", description: `${u.name} was declined and emailed the reason.`, variant: "destructive" });
      setReviewUser(null);
      setDeclineReason("");
    } catch (err) {
      toast({ title: "Rejection failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmPayment = async (paymentId: string) => {
    try {
      await adminApi.confirmPayment(paymentId);
      toast({ title: "Payment Confirmed", description: "The mentor has been notified to review the session." });
      loadAll();
    } catch (err) {
      toast({ title: "Action failed", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleViewReceipt = async (paymentId: string) => {
    setBusyId(paymentId);
    try {
      const receipt = await paymentApi.getReceipt(paymentId);
      if (!receipt) {
        toast({ title: "No receipt", description: "The student hasn't uploaded a receipt for this payment.", variant: "destructive" });
        return;
      }
      openDataUrl(receipt);
    } catch (err) {
      toast({ title: "Couldn't load receipt", description: (err as Error).message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const submitDeclinePayment = async () => {
    if (!payDeclineId) return;
    if (!payDeclineReason.trim()) {
      toast({ title: "Reason required", description: "Please provide a reason — it will be emailed to the student.", variant: "destructive" });
      return;
    }
    try {
      await adminApi.declinePayment(payDeclineId, payDeclineReason.trim());
      toast({ title: "Payment Declined", description: "The student has been emailed the reason and the booking was cancelled." });
      setPayDeclineId(null);
      setPayDeclineReason("");
      loadAll();
    } catch (err) {
      toast({ title: "Action failed", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    try {
      await adminApi.deleteUser(userId);
      setMentors((prev) => prev.filter((m) => m.userId !== userId));
      setStudentsState((prev) => prev.filter((s) => s.userId !== userId));
      toast({ title: "User Deleted", description: `${name} has been removed.`, variant: "destructive" });
    } catch (err) {
      toast({ title: "Delete failed", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleCancelSession = async (sessionId: string) => {
    try {
      await adminApi.cancelSession(sessionId);
      setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, status: "CANCELLED" } : s)));
      toast({ title: "Session Cancelled", description: "Both parties have been notified." });
    } catch (err) {
      toast({ title: "Action failed", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!window.confirm("Delete this session permanently? Its payment and review will also be removed and the mentor's stats recalculated. This cannot be undone.")) return;
    try {
      await adminApi.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast({ title: "Session Deleted", description: "The session, its payment and review were removed.", variant: "destructive" });
    } catch (err) {
      toast({ title: "Delete failed", description: (err as Error).message, variant: "destructive" });
    }
  };

  const filteredSessions = sessions.filter(
    (s) =>
      sessionSearch === "" ||
      s.studentName.toLowerCase().includes(sessionSearch.toLowerCase()) ||
      s.mentorName.toLowerCase().includes(sessionSearch.toLowerCase()) ||
      s.topic.toLowerCase().includes(sessionSearch.toLowerCase())
  );
  const filteredPayments = payments.filter(
    (p) =>
      paySearch === "" ||
      p.studentName.toLowerCase().includes(paySearch.toLowerCase()) ||
      p.mentorName.toLowerCase().includes(paySearch.toLowerCase())
  );
  const filteredStudents = studentsState.filter(
    (s) =>
      studentSearch === "" ||
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.email.toLowerCase().includes(studentSearch.toLowerCase())
  );
  const filteredMentors = mentors.filter(
    (m) =>
      mentorSearch === "" ||
      m.name.toLowerCase().includes(mentorSearch.toLowerCase()) ||
      m.field.toLowerCase().includes(mentorSearch.toLowerCase())
  );

  const reviewMentor = reviewUser ? mentors.find((m) => m.userId === reviewUser._id) : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Platform overview and management</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: "Total Students", value: stats?.totalStudents ?? 0, icon: GraduationCap, color: "text-primary", bg: "bg-primary/10" },
            { label: "Total Mentors", value: stats?.totalMentors ?? 0, icon: Briefcase, color: "text-action", bg: "bg-action/10" },
            { label: "Total Sessions", value: stats?.totalSessions ?? 0, icon: Calendar, color: "text-green-600", bg: "bg-green-50" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label} className="border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${bg}`}><Icon className={`h-5 w-5 ${color}`} /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="text-xl font-bold text-foreground">{value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Alerts Row */}
        <div className="grid md:grid-cols-3 gap-4">
          {(stats?.pendingApprovals ?? 0) > 0 && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="p-4 flex items-center gap-3">
                <UserCheck className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-800">{stats?.pendingApprovals} Accounts Awaiting Approval</p>
                  <p className="text-xs text-blue-700">{stats?.pendingStudentApprovals} students · {stats?.pendingMentorApprovals} mentors</p>
                </div>
              </CardContent>
            </Card>
          )}
          {(stats?.pendingPayments ?? 0) > 0 && (
            <Card className="border-yellow-200 bg-yellow-50/50">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-800">{stats?.pendingPayments} Pending Payments</p>
                  <p className="text-xs text-yellow-700">Require admin confirmation</p>
                </div>
              </CardContent>
            </Card>
          )}
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="p-4 flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">{stats?.upcomingSessions ?? 0} Upcoming Sessions</p>
                <p className="text-xs text-green-700">Approved & scheduled</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Management Tabs */}
        <Tabs defaultValue="approvals" className="space-y-4">
          <TabsList className="grid grid-cols-3 sm:grid-cols-7 w-full max-w-4xl h-auto gap-1">
            <TabsTrigger value="approvals">
              Approvals{pending.length > 0 && <span className="ml-1.5 bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5">{pending.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="payouts">Payouts</TabsTrigger>
            <TabsTrigger value="badges">Badges</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="mentors">Mentors</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
          </TabsList>

          {/* Approvals Tab */}
          <TabsContent value="approvals">
            <Card className="border-border">
              <CardHeader><CardTitle>Pending Account Approvals</CardTitle></CardHeader>
              <CardContent>
                {pending.length === 0 ? (
                  <div className="py-16 text-center">
                    <CheckCircle2 className="h-10 w-10 text-green-500/60 mx-auto mb-3" />
                    <p className="text-muted-foreground">All caught up — no accounts awaiting approval.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pending.map((u) => (
                      <div key={u._id} className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className={u.role === "mentor" ? "bg-action/10 text-action" : "bg-primary/10 text-primary"}>
                              {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{u.name}</p>
                              <Badge variant="outline" className="capitalize text-xs">{u.role}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                            {u.createdAt && <p className="text-xs text-muted-foreground">Applied {new Date(u.createdAt).toLocaleDateString()}</p>}
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button size="sm" variant="outline" className="gap-1.5"
                            onClick={() => { setReviewUser(u); setDeclineReason(""); }}>
                            <Eye className="h-4 w-4" />Review Application
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Payment Management</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Search by student or mentor..." value={paySearch} onChange={(e) => setPaySearch(e.target.value)} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground text-left">
                        <th className="pb-3 pr-4">Student</th>
                        <th className="pb-3 pr-4">Mentor</th>
                        <th className="pb-3 pr-4">Service</th>
                        <th className="pb-3 pr-4">Amount</th>
                        <th className="pb-3 pr-4">Status</th>
                        <th className="pb-3 pr-4">Date</th>
                        <th className="pb-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredPayments.length === 0 && (
                        <tr><td colSpan={7} className="py-10 text-center text-muted-foreground">No payments found.</td></tr>
                      )}
                      {filteredPayments.map((payment) => (
                        <tr key={payment.id} className="py-3">
                          <td className="py-3 pr-4 font-medium">{payment.studentName}</td>
                          <td className="py-3 pr-4 text-muted-foreground">{payment.mentorName}</td>
                          <td className="py-3 pr-4 text-muted-foreground">{payment.packageName || "—"}</td>
                          <td className="py-3 pr-4 font-medium">Rs {payment.amount.toLocaleString()}</td>
                          <td className="py-3 pr-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[payment.status]}`}>
                              {payment.status}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground text-xs">
                            {new Date(payment.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3">
                            {payment.status === "PENDING" && payment.studentPaidAt && (
                              <div className="flex flex-wrap gap-1.5">
                                <Button size="sm" variant="outline" className="text-xs gap-1"
                                  disabled={busyId === payment.id}
                                  onClick={() => handleViewReceipt(payment.id)}>
                                  <FileText className="h-3.5 w-3.5" />Receipt
                                </Button>
                                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs"
                                  onClick={() => handleConfirmPayment(payment.id)}>
                                  Confirm
                                </Button>
                                <Button size="sm" variant="outline" className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => { setPayDeclineId(payment.id); setPayDeclineReason(""); }}>
                                  Decline
                                </Button>
                              </div>
                            )}
                            {payment.status === "PENDING" && !payment.studentPaidAt && (
                              <span className="text-xs text-muted-foreground">Awaiting payment</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payouts Tab */}
          <TabsContent value="payouts">
            <AdminPayoutsTab />
          </TabsContent>

          {/* Badges Tab */}
          <TabsContent value="badges">
            <AdminBadgesTab />
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions">
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Session Management</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Search sessions..." value={sessionSearch} onChange={(e) => setSessionSearch(e.target.value)} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground text-left">
                        <th className="pb-3 pr-4">Student</th>
                        <th className="pb-3 pr-4">Mentor</th>
                        <th className="pb-3 pr-4">Topic</th>
                        <th className="pb-3 pr-4">Date / Time</th>
                        <th className="pb-3 pr-4">Status</th>
                        <th className="pb-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredSessions.length === 0 && (
                        <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">No sessions found.</td></tr>
                      )}
                      {filteredSessions.map((session) => (
                        <tr key={session.id}>
                          <td className="py-3 pr-4 font-medium">{session.studentName}</td>
                          <td className="py-3 pr-4 text-muted-foreground">{session.mentorName}</td>
                          <td className="py-3 pr-4 text-muted-foreground max-w-[150px] truncate">{session.topic}</td>
                          <td className="py-3 pr-4 text-muted-foreground text-xs">{session.date}<br />{formatTime12h(session.time)}</td>
                          <td className="py-3 pr-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[session.status]}`}>
                              {session.status.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="py-3">
                            <div className="flex gap-1">
                              <Link to={`/session/${session.id}`}>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0"><Eye className="h-3.5 w-3.5" /></Button>
                              </Link>
                              {session.status !== "CANCELLED" && session.status !== "COMPLETED" && (
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-amber-500 hover:text-amber-600" title="Cancel session"
                                  onClick={() => handleCancelSession(session.id)}>
                                  <XCircle className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-700" title="Delete session"
                                onClick={() => handleDeleteSession(session.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mentors Tab */}
          <TabsContent value="mentors">
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Mentor Management</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Search mentors..." value={mentorSearch} onChange={(e) => setMentorSearch(e.target.value)} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground text-left">
                        <th className="pb-3 pr-4">Name</th>
                        <th className="pb-3 pr-4">Field</th>
                        <th className="pb-3 pr-4">City</th>
                        <th className="pb-3 pr-4">Sessions</th>
                        <th className="pb-3 pr-4">Status</th>
                        <th className="pb-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredMentors.length === 0 && (
                        <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">No mentors found.</td></tr>
                      )}
                      {filteredMentors.map((mentor) => (
                        <tr key={mentor.id}>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-action/10 text-action text-xs">
                                  {mentor.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{mentor.name}</p>
                                <p className="text-xs text-muted-foreground">{mentor.title}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">{mentor.field}</td>
                          <td className="py-3 pr-4 text-muted-foreground">{mentor.city}</td>
                          <td className="py-3 pr-4 font-medium">{mentor.sessionsCount}</td>
                          <td className="py-3 pr-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${mentor.isApproved ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                              {mentor.isApproved ? "Active" : "Pending"}
                            </span>
                          </td>
                          <td className="py-3">
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                onClick={() => openEditMentor(mentor)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                                onClick={() => handleDeleteUser(mentor.userId, mentor.name)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students">
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Student Management</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Search students..." value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground text-left">
                        <th className="pb-3 pr-4">Name</th>
                        <th className="pb-3 pr-4">Email</th>
                        <th className="pb-3 pr-4">University</th>
                        <th className="pb-3 pr-4">Field</th>
                        <th className="pb-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredStudents.length === 0 && (
                        <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">No students found.</td></tr>
                      )}
                      {filteredStudents.map((student) => (
                        <tr key={student.id}>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                  {student.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{student.name}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground text-xs">{student.email}</td>
                          <td className="py-3 pr-4 text-muted-foreground text-xs max-w-[120px] truncate">{student.university}</td>
                          <td className="py-3 pr-4 text-muted-foreground">{student.field}</td>
                          <td className="py-3">
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                onClick={() => openEditStudent(student)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                                onClick={() => handleDeleteUser(student.userId, student.name)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Decline payment dialog */}
      <Dialog open={!!payDeclineId} onOpenChange={(o) => { if (!o) { setPayDeclineId(null); setPayDeclineReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Payment</DialogTitle>
            <DialogDescription>A reason is required and will be emailed to the student. The booking will be cancelled.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="pay-decline-reason">Reason for declining *</Label>
            <textarea id="pay-decline-reason" rows={4} value={payDeclineReason} onChange={(e) => setPayDeclineReason(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="e.g. Payment could not be verified / amount not received…" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPayDeclineId(null); setPayDeclineReason(""); }}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" disabled={!payDeclineReason.trim()} onClick={submitDeclinePayment}>
              Decline Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review application dialog */}
      <Dialog open={!!reviewUser} onOpenChange={(o) => { if (!o) { setReviewUser(null); setDeclineReason(""); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Mentor Application</DialogTitle>
            <DialogDescription>Review the applicant's details, then approve or decline. Declining emails the reason to the applicant.</DialogDescription>
          </DialogHeader>

          {reviewUser && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground">Name</span><span className="col-span-2 font-medium">{reviewUser.name}</span>
                <span className="text-muted-foreground">Email</span><span className="col-span-2 font-medium">{reviewUser.email}</span>
                {reviewUser.createdAt && (<><span className="text-muted-foreground">Applied</span><span className="col-span-2">{new Date(reviewUser.createdAt).toLocaleString()}</span></>)}
              </div>
              {reviewMentor ? (
                <div className="grid grid-cols-3 gap-2 border-t border-border pt-3">
                  <span className="text-muted-foreground">Type</span><span className="col-span-2 capitalize">{reviewMentor.type}</span>
                  <span className="text-muted-foreground">Field</span><span className="col-span-2">{reviewMentor.field}</span>
                  <span className="text-muted-foreground">Title</span><span className="col-span-2">{reviewMentor.title}</span>
                  <span className="text-muted-foreground">Specialization</span><span className="col-span-2">{reviewMentor.skills?.join(", ") || "—"}</span>
                  <span className="text-muted-foreground">Experience</span><span className="col-span-2">{reviewMentor.yearsOfExperience ?? 0} yrs</span>
                  <span className="text-muted-foreground">Qualification</span><span className="col-span-2">{reviewMentor.qualification || "—"}</span>
                  <span className="text-muted-foreground">City</span><span className="col-span-2">{reviewMentor.city || "—"}</span>
                  <span className="text-muted-foreground">Company / Uni</span><span className="col-span-2">{reviewMentor.company || reviewMentor.university || "—"}</span>
                  <span className="text-muted-foreground">Rate</span><span className="col-span-2">Rs {reviewMentor.hourlyRate?.toLocaleString()}</span>
                  <span className="text-muted-foreground">Languages</span><span className="col-span-2">{reviewMentor.languages?.join(", ") || "—"}</span>
                  <span className="text-muted-foreground">Bio</span><span className="col-span-2 whitespace-pre-wrap">{reviewMentor.bio || "—"}</span>
                  {reviewMentor.achievements && (<><span className="text-muted-foreground">Achievements</span><span className="col-span-2 whitespace-pre-wrap">{reviewMentor.achievements}</span></>)}
                  {reviewMentor.certifications && (<><span className="text-muted-foreground">Certifications</span><span className="col-span-2 whitespace-pre-wrap">{reviewMentor.certifications}</span></>)}
                </div>
              ) : (
                <p className="text-muted-foreground border-t border-border pt-3">Profile details could not be loaded.</p>
              )}

              <div className="border-t border-border pt-3">
                <p className="text-sm font-medium text-foreground mb-2">Uploaded Certificates</p>
                {certsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading…</div>
                ) : reviewCerts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No certificate files uploaded by this applicant.</p>
                ) : (
                  <div className="space-y-1.5">
                    {reviewCerts.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg border border-border p-2">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-sm truncate flex-1">{c.name}</span>
                        <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => openDataUrl(c.data)}>
                          <Eye className="h-3.5 w-3.5" />View PDF
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5 border-t border-border pt-3">
                <Label htmlFor="decline-reason">Reason (required only if declining)</Label>
                <textarea id="decline-reason" rows={3} value={declineReason} onChange={(e) => setDeclineReason(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="e.g. Insufficient experience / unverifiable credentials…" />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50"
              disabled={!!busyId || !declineReason.trim()}
              onClick={() => reviewUser && handleReject(reviewUser, declineReason)}>
              <XCircle className="h-4 w-4 mr-1.5" />Decline
            </Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white"
              disabled={!!busyId}
              onClick={() => reviewUser && handleApprove(reviewUser)}>
              {busyId ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
