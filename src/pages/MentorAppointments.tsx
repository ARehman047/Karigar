import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { sessionApi, paymentApi } from "@/lib/services";
import { openDataUrl } from "@/lib/file";
import { getSessionTiming, formatTime12h } from "@/lib/session";
import { Session } from "@/types";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar, Clock, Video, CheckCircle2, XCircle, BookOpen,
  Package, MessageSquare, Users, Inbox, Loader2, CalendarClock, Search, Wallet,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  PENDING_MENTOR_APPROVAL: "bg-blue-100 text-blue-700",
  PENDING_ADMIN_CONFIRMATION: "bg-amber-100 text-amber-700",
  PENDING_MENTOR_PAYOUT: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  RESCHEDULE_REQUESTED: "bg-orange-100 text-orange-700",
  COMPLETED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-50 text-red-400",
  PENDING_PAYMENT: "bg-yellow-100 text-yellow-700",
};

const MentorAppointments = () => {
  const { toast } = useToast();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");

  // Decline dialog
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  // Reschedule dialog
  const [reschedId, setReschedId] = useState<string | null>(null);
  const [reschedDate, setReschedDate] = useState("");
  const [reschedTime, setReschedTime] = useState("");
  const [reschedReason, setReschedReason] = useState("");

  useEffect(() => {
    let active = true;
    sessionApi
      .list()
      .then((data) => active && setSessions(data))
      .catch((err) => toast({ title: "Couldn't load requests", description: err.message, variant: "destructive" }))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [toast]);

  // Filter by student name (search).
  const q = search.trim().toLowerCase();
  const base = q ? sessions.filter((s) => (s.studentName || "").toLowerCase().includes(q)) : sessions;

  const pending = base.filter((s) => s.status === "PENDING_MENTOR_APPROVAL");
  // Accepted = requests the mentor approved (upcoming, in-progress, over, or completed).
  const accepted = base.filter((s) => ["APPROVED", "RESCHEDULE_REQUESTED", "COMPLETED"].includes(s.status));
  // Rejected = mentor declined, or the booking was cancelled.
  const rejected = base.filter((s) => ["REJECTED", "CANCELLED"].includes(s.status));

  const viewPayout = async (paymentId?: string) => {
    if (!paymentId) {
      toast({ title: "No payout record", description: "No payout receipt is available for this session.", variant: "destructive" });
      return;
    }
    try {
      const img = await paymentApi.getPayoutReceipt(paymentId);
      if (!img) {
        toast({ title: "No receipt yet", description: "The payout receipt isn't available.", variant: "destructive" });
        return;
      }
      openDataUrl(img);
    } catch (err) {
      toast({ title: "Couldn't load receipt", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleAccept = async (id: string) => {
    setBusy(true);
    try {
      const updated = await sessionApi.updateStatus(id, "approve");
      setSessions((prev) => prev.map((s) => (s.id === id ? updated : s)));
      toast({ title: "Session Accepted", description: "The student has been notified by email." });
    } catch (err) {
      toast({ title: "Action failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const submitDecline = async () => {
    if (!declineId) return;
    if (!declineReason.trim()) {
      toast({ title: "Reason required", description: "Please provide a reason for declining.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const updated = await sessionApi.updateStatus(declineId, "reject", declineReason.trim());
      setSessions((prev) => prev.map((s) => (s.id === declineId ? updated : s)));
      toast({ title: "Session Declined", description: "The student has been notified with your reason." });
      setDeclineId(null);
      setDeclineReason("");
    } catch (err) {
      toast({ title: "Action failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const submitReschedule = async () => {
    if (!reschedId) return;
    if (!reschedDate || !reschedTime || !reschedReason.trim()) {
      toast({ title: "All fields required", description: "Provide a new date, time and a reason.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const updated = await sessionApi.requestReschedule(reschedId, {
        proposedDate: reschedDate,
        proposedTime: reschedTime,
        reason: reschedReason.trim(),
      });
      setSessions((prev) => prev.map((s) => (s.id === reschedId ? updated : s)));
      toast({ title: "Reschedule Requested", description: "The student has been emailed to accept or decline." });
      setReschedId(null);
      setReschedDate("");
      setReschedTime("");
      setReschedReason("");
    } catch (err) {
      toast({ title: "Action failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const SessionCard = ({ session, showActions = false }: { session: Session; showActions?: boolean }) => {
    const studentName = session.studentName || "Former member";
    const initials = studentName.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "?";
    const TypeIcon = session.type === "chat" ? MessageSquare : Video;
    return (
      <Card className="border-border hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12 border-2 border-border shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <p className="font-semibold text-foreground">{studentName}</p>
                  <p className="text-sm text-muted-foreground truncate">{session.topic}</p>
                  {session.studentRemoved && (
                    <p className="text-xs text-amber-600 mt-0.5">This student has left Karigar.</p>
                  )}
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_COLORS[session.status]}`}>
                  {session.status === "RESCHEDULE_REQUESTED" ? "Awaiting student response" : session.status.replace(/_/g, " ")}
                </span>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{session.date}</span>
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatTime12h(session.time)} • {session.duration} min</span>
                <span className="flex items-center gap-1"><TypeIcon className="h-3.5 w-3.5" />{session.type}</span>
                {session.packageName && <span className="flex items-center gap-1"><Package className="h-3.5 w-3.5" />{session.packageName}</span>}
              </div>
              {session.message && (
                <p className="text-sm text-muted-foreground bg-muted/40 rounded p-2 italic">"{session.message}"</p>
              )}
              {session.status === "RESCHEDULE_REQUESTED" && (
                <p className="text-xs text-orange-700 bg-orange-50 rounded p-2">
                  You proposed {session.proposedDate} at {formatTime12h(session.proposedTime)}. Waiting for the student to accept.
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2 mt-4 justify-end">
            {showActions && session.status === "PENDING_MENTOR_APPROVAL" && (
              <>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => viewPayout(session.paymentId)}>
                  <Wallet className="h-4 w-4" />View Payment Received
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50" onClick={() => setDeclineId(session.id)}>
                  <XCircle className="h-4 w-4" />Decline
                </Button>
                <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 text-white" disabled={busy} onClick={() => handleAccept(session.id)}>
                  <CheckCircle2 className="h-4 w-4" />Accept
                </Button>
              </>
            )}
            {session.status === "APPROVED" && (() => {
              const timing = getSessionTiming(session);
              return (
                <>
                  <Link to={`/session/${session.id}`}>
                    <Button size="sm" variant="outline" className="gap-1.5">View</Button>
                  </Link>
                  {/* Reschedule + Join only while the session hasn't ended. Once it's
                      over it moves to Past and these actions disappear. */}
                  {!timing.hasEnded && (
                    <>
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setReschedId(session.id)}>
                        <CalendarClock className="h-4 w-4" />Reschedule
                      </Button>
                      <Link to={`/session/${session.id}/call`} title={timing.isOngoing ? "Join now" : "Becomes active 15 minutes before the session"}>
                        <Button
                          size="sm"
                          variant="action"
                          className={`gap-1.5 transition-all ${timing.isOngoing ? "" : "opacity-40 grayscale hover:opacity-60"}`}
                        >
                          <Video className="h-4 w-4" />{timing.isOngoing ? "Join Now" : "Join Call"}
                        </Button>
                      </Link>
                    </>
                  )}
                </>
              );
            })()}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Session Requests</h1>
          <p className="text-muted-foreground mt-1">Review incoming session requests from students and accept, decline, or reschedule them.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
        <>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Pending Requests", value: pending.length, icon: Inbox, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Accepted", value: accepted.length, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
            { label: "Total Students", value: new Set(sessions.map((s) => s.studentId)).size, icon: Users, color: "text-primary", bg: "bg-primary/10" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label} className="border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${bg}`}><Icon className={`h-5 w-5 ${color}`} /></div>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold text-foreground">{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by student name…" className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <Tabs defaultValue="pending">
          <TabsList className="grid grid-cols-3 w-full max-w-sm">
            <TabsTrigger value="pending">
              Pending{pending.length > 0 && <span className="ml-1.5 bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5">{pending.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="accepted">Accepted ({accepted.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-3 mt-4">
            {pending.length === 0 ? (
              <Card className="border-border"><CardContent className="py-16 text-center">
                <Inbox className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground">No pending session requests</p>
              </CardContent></Card>
            ) : pending.map((s) => <SessionCard key={s.id} session={s} showActions />)}
          </TabsContent>

          <TabsContent value="accepted" className="space-y-3 mt-4">
            {accepted.length === 0 ? (
              <Card className="border-border"><CardContent className="py-16 text-center">
                <BookOpen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground">No accepted sessions yet</p>
              </CardContent></Card>
            ) : accepted.map((s) => <SessionCard key={s.id} session={s} />)}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-3 mt-4">
            {rejected.length === 0 ? (
              <Card className="border-border"><CardContent className="py-16 text-center">
                <XCircle className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground">No rejected sessions</p>
              </CardContent></Card>
            ) : rejected.map((s) => <SessionCard key={s.id} session={s} />)}
          </TabsContent>
        </Tabs>
        </>
        )}
      </main>

      {/* Decline dialog — reason mandatory */}
      <Dialog open={!!declineId} onOpenChange={(o) => { if (!o) { setDeclineId(null); setDeclineReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Session Request</DialogTitle>
            <DialogDescription>A reason is required and will be emailed to the student.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="decline-reason">Reason for declining *</Label>
            <Textarea id="decline-reason" rows={4} value={declineReason} onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="e.g. I'm not available at this time / topic is outside my expertise…" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeclineId(null); setDeclineReason(""); }}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" disabled={busy || !declineReason.trim()} onClick={submitDecline}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Decline Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule dialog — reason + new date/time mandatory */}
      <Dialog open={!!reschedId} onOpenChange={(o) => { if (!o) { setReschedId(null); setReschedDate(""); setReschedTime(""); setReschedReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Reschedule</DialogTitle>
            <DialogDescription>Propose a new time and a reason. The student will be emailed to accept or decline.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="resched-date">New Date *</Label>
                <Input id="resched-date" type="date" value={reschedDate} onChange={(e) => setReschedDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="resched-time">New Time *</Label>
                <Input id="resched-time" type="time" value={reschedTime} onChange={(e) => setReschedTime(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="resched-reason">Reason *</Label>
              <Textarea id="resched-reason" rows={3} value={reschedReason} onChange={(e) => setReschedReason(e.target.value)}
                placeholder="e.g. A conflict came up at the original time…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReschedId(null); setReschedDate(""); setReschedTime(""); setReschedReason(""); }}>Cancel</Button>
            <Button variant="action" disabled={busy || !reschedDate || !reschedTime || !reschedReason.trim()} onClick={submitReschedule}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Reschedule Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MentorAppointments;
