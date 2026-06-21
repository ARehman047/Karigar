import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { sessionApi } from "@/lib/services";
import { formatTime12h, getSessionTiming } from "@/lib/session";
import { Session } from "@/types";
import { Link } from "react-router-dom";
import {
  Calendar, Users, Star, CheckCircle2, Clock, Bell,
  TrendingUp, ArrowRight, BookOpen, XCircle, Loader2, Video
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MentorBadgeCard } from "@/components/mentor/MentorBadgeCard";

const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: "bg-yellow-100 text-yellow-700",
  PENDING_ADMIN_CONFIRMATION: "bg-amber-100 text-amber-700",
  PENDING_MENTOR_APPROVAL: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  RESCHEDULE_REQUESTED: "bg-orange-100 text-orange-700",
  COMPLETED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-50 text-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Pending Payment",
  PENDING_ADMIN_CONFIRMATION: "Payment Review",
  PENDING_MENTOR_APPROVAL: "Awaiting Your Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  RESCHEDULE_REQUESTED: "Reschedule Sent",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const MentorDashboard = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const mentorRating = Number((profile as { rating?: number } | null)?.rating ?? 0);
  const mentorSessions = Number((profile as { sessionsCount?: number } | null)?.sessionsCount ?? 0);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await sessionApi.list();
        if (active) setSessions(data);
      } catch (err) {
        if (active)
          toast({
            title: "Failed to load dashboard",
            description: err instanceof Error ? err.message : "Something went wrong.",
            variant: "destructive",
          });
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [toast]);

  const pendingApproval = sessions.filter((s) => s.status === "PENDING_MENTOR_APPROVAL");
  // Approved sessions that haven't ended yet are upcoming; ended ones drop off.
  const upcoming = sessions.filter((s) => s.status === "APPROVED" && !getSessionTiming(s).hasEnded);
  // Completed once it has taken place — a review is optional.
  const completed = sessions.filter((s) => s.status === "COMPLETED" || (s.status === "APPROVED" && getSessionTiming(s).hasEnded));
  const uniqueStudents = new Set(sessions.map((s) => s.studentId)).size;

  const handleApprove = async (sessionId: string) => {
    try {
      const updated = await sessionApi.updateStatus(sessionId, "approve");
      setSessions((prev) => prev.map((s) => (s.id === sessionId ? updated : s)));
      toast({ title: "Session Approved", description: "The student has been notified." });
    } catch (err) {
      toast({
        title: "Failed to approve session",
        description: err instanceof Error ? err.message : "Something went wrong.",
        variant: "destructive",
      });
    }
  };

  const submitDecline = async () => {
    if (!declineId) return;
    if (!declineReason.trim()) {
      toast({ title: "Reason required", description: "Please provide a reason for declining.", variant: "destructive" });
      return;
    }
    try {
      const updated = await sessionApi.updateStatus(declineId, "reject", declineReason.trim());
      setSessions((prev) => prev.map((s) => (s.id === declineId ? updated : s)));
      toast({ title: "Session Declined", description: "The student has been notified with your reason." });
      setDeclineId(null);
      setDeclineReason("");
    } catch (err) {
      toast({
        title: "Failed to decline session",
        description: err instanceof Error ? err.message : "Something went wrong.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
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
        {/* Welcome */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome, {user?.name?.split(" ")[0] || "Mentor"}!
            </h1>
            <p className="text-muted-foreground mt-1">Manage your sessions and track your impact</p>
          </div>
          <Link to="/notifications">
            <Button variant="outline" className="gap-2 relative">
              <Bell className="h-4 w-4" />
              Notifications
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Pending Approval", value: pendingApproval.length, icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Upcoming Sessions", value: upcoming.length, icon: Calendar, color: "text-green-600", bg: "bg-green-50" },
            { label: "Completed Sessions", value: completed.length, icon: CheckCircle2, color: "text-primary", bg: "bg-primary/10" },
            { label: "Total Students", value: uniqueStudents, icon: Users, color: "text-action", bg: "bg-action/10" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label} className="border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${bg}`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="text-xl font-bold text-foreground">{value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Badge status + application */}
        <MentorBadgeCard />

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Pending Approvals */}
          <div className="lg:col-span-2 space-y-4">
            {pendingApproval.length > 0 && (
              <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-blue-700">
                    <Clock className="h-5 w-5" />
                    Sessions Awaiting Your Approval ({pendingApproval.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pendingApproval.map((session) => (
                    <div key={session.id} className="bg-white rounded-xl p-4 border border-blue-100 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {session.studentName.split(" ").map((n) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-foreground">{session.studentName}</p>
                            <p className="text-sm text-muted-foreground">{session.topic}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50">
                          Needs Approval
                        </Badge>
                      </div>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{session.date}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatTime12h(session.time)}</span>
                        <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{session.type}</span>
                      </div>
                      {session.message && (
                        <p className="text-sm text-muted-foreground italic">"{session.message}"</p>
                      )}
                      <div className="flex gap-2">
                        <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleApprove(session.id)}>
                          <CheckCircle2 className="h-4 w-4" />Accept
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => setDeclineId(session.id)}>
                          <XCircle className="h-4 w-4" />Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Upcoming Sessions */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-action" />
                    Upcoming Sessions
                  </CardTitle>
                  <Link to="/sessions">
                    <Button variant="ghost" size="sm" className="gap-1 text-action">
                      View all <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcoming.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No upcoming sessions</p>
                ) : (
                  upcoming.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {session.studentName.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{session.studentName}</p>
                          <p className="text-sm text-muted-foreground">{session.topic}</p>
                          <p className="text-xs text-muted-foreground">{session.date} • {formatTime12h(session.time)} • {session.duration}min</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link to={`/session/${session.id}`}>
                          <Button size="sm" variant="outline">View</Button>
                        </Link>
                        {(() => {
                          const timing = getSessionTiming(session);
                          return (
                            <Link to={`/session/${session.id}/call`} title={timing.isOngoing ? "Join now" : "Becomes active 15 minutes before the session"}>
                              <Button
                                size="sm"
                                variant="action"
                                className={`gap-1 transition-all ${timing.isOngoing ? "" : "opacity-40 grayscale hover:opacity-60"}`}
                              >
                                <Video className="h-4 w-4" />{timing.isOngoing ? "Join Now" : "Join Call"}
                              </Button>
                            </Link>
                          );
                        })()}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Profile Card */}
            <Card className="border-border">
              <CardContent className="p-5 text-center space-y-3">
                <Avatar className="h-16 w-16 mx-auto border-2 border-primary">
                  {user?.avatar ? <AvatarImage src={user.avatar} alt={user.name} className="object-cover" /> : null}
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {user?.name?.split(" ").map((n) => n[0]).join("") || "M"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-foreground">{user?.name || "Mentor"}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
                <div className="flex items-center justify-center gap-1">
                  {mentorSessions > 0 ? (
                    <>
                      <Star className="h-4 w-4 fill-warning text-warning" />
                      <span className="font-semibold">{mentorRating.toFixed(1)}</span>
                      <span className="text-muted-foreground text-sm">({mentorSessions} session{mentorSessions === 1 ? "" : "s"})</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground text-sm">No sessions yet</span>
                  )}
                </div>
                <Link to="/mentor-profile-edit">
                  <Button variant="outline" size="sm" className="w-full">Edit Profile</Button>
                </Link>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-action" />
                  This Month
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Upcoming", value: String(upcoming.length) },
                  { label: "Completed", value: String(completed.length) },
                  { label: "Students", value: String(uniqueStudents) },
                  { label: "Pending Requests", value: String(pendingApproval.length) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium text-foreground">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Completed Sessions */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Recent Students
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {sessions.filter((s) => s.status === "COMPLETED" || s.status === "APPROVED").slice(0, 3).map((s) => (
                  <div key={s.id} className="flex items-center gap-2 text-sm">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-secondary text-xs">
                        {s.studentName.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-foreground">{s.studentName}</span>
                    <span className={`ml-auto text-xs px-1.5 py-0.5 rounded ${STATUS_COLORS[s.status]}`}>
                      {STATUS_LABELS[s.status]}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Decline dialog — reason mandatory */}
      <Dialog open={!!declineId} onOpenChange={(o) => { if (!o) { setDeclineId(null); setDeclineReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Session Request</DialogTitle>
            <DialogDescription>A reason is required and will be emailed to the student.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="dash-decline-reason">Reason for declining *</Label>
            <Textarea id="dash-decline-reason" rows={4} value={declineReason} onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="e.g. I'm not available at this time / topic is outside my expertise…" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeclineId(null); setDeclineReason(""); }}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" disabled={!declineReason.trim()} onClick={submitDecline}>
              Decline Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MentorDashboard;
