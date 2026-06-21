import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { sessionApi } from "@/lib/services";
import { getSessionTiming, formatTime12h } from "@/lib/session";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { RatingDialog } from "@/components/session/RatingDialog";
import { SessionReviewButton } from "@/components/session/SessionReviewButton";
import { useToast } from "@/hooks/use-toast";
import { Session } from "@/types";
import { Link } from "react-router-dom";
import {
  Calendar, Clock, Video, CheckCircle2, XCircle,
  Star, BookOpen, DollarSign, Loader2, CalendarClock, Search
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING_PAYMENT: { label: "Pending Payment", color: "bg-yellow-100 text-yellow-700", icon: DollarSign },
  PENDING_ADMIN_CONFIRMATION: { label: "Verifying Payment", color: "bg-amber-100 text-amber-700", icon: Clock },
  PENDING_MENTOR_PAYOUT: { label: "Finalizing", color: "bg-amber-100 text-amber-700", icon: Clock },
  PENDING_MENTOR_APPROVAL: { label: "Awaiting Mentor", color: "bg-blue-100 text-blue-700", icon: Clock },
  APPROVED: { label: "Approved", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  REJECTED: { label: "Declined", color: "bg-red-100 text-red-700", icon: XCircle },
  RESCHEDULE_REQUESTED: { label: "Reschedule Requested", color: "bg-orange-100 text-orange-700", icon: CalendarClock },
  COMPLETED: { label: "Completed", color: "bg-gray-100 text-gray-600", icon: CheckCircle2 },
  CANCELLED: { label: "Cancelled", color: "bg-red-50 text-red-400", icon: XCircle },
};

const Sessions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMentor = user?.role === "mentor";

  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [ratingSession, setRatingSession] = useState<Session | null>(null);
  const [search, setSearch] = useState("");
  const [cancelId, setCancelId] = useState<string | null>(null);

  const reload = () => sessionApi.list().then(setSessions).catch(() => {});

  const confirmCancel = async () => {
    if (!cancelId) return;
    setBusyId(cancelId);
    try {
      await sessionApi.cancel(cancelId);
      setSessions((prev) => prev.filter((s) => s.id !== cancelId));
      toast({ title: "Booking cancelled", description: "The session was removed. You haven't been charged." });
      setCancelId(null);
    } catch (err) {
      toast({ title: "Couldn't cancel", description: (err as Error).message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const respondReschedule = async (id: string, accept: boolean) => {
    setBusyId(id);
    try {
      const updated = await sessionApi.respondReschedule(id, accept);
      setSessions((prev) => prev.map((s) => (s.id === id ? updated : s)));
      toast({
        title: accept ? "Reschedule accepted" : "Reschedule declined",
        description: accept ? "Your session has been moved to the new time." : "Your session keeps its original time.",
      });
    } catch (err) {
      toast({ title: "Action failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await sessionApi.list();
        if (active) setSessions(data);
      } catch (err) {
        if (active)
          toast({
            title: "Failed to load sessions",
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

  // Mentors don't deal with the payment stages, so those are hidden from them.
  const upcomingStatuses = isMentor
    ? ["APPROVED", "PENDING_MENTOR_APPROVAL", "RESCHEDULE_REQUESTED"]
    : ["APPROVED", "PENDING_MENTOR_APPROVAL", "PENDING_MENTOR_PAYOUT", "PENDING_ADMIN_CONFIRMATION", "RESCHEDULE_REQUESTED"];
  // Search by the other party's name (mentor sees students, student sees mentors).
  const q = search.trim().toLowerCase();
  const base = q
    ? sessions.filter((s) => ((isMentor ? s.studentName : s.mentorName) || "").toLowerCase().includes(q))
    : sessions;

  // An APPROVED session whose end time has passed is over — it belongs in History,
  // not Upcoming (even if the student hasn't reviewed it yet).
  const isEndedApproved = (s: Session) => s.status === "APPROVED" && getSessionTiming(s).hasEnded;
  const upcoming = base.filter((s) => upcomingStatuses.includes(s.status) && !isEndedApproved(s));
  const pending = base.filter((s) => s.status === "PENDING_PAYMENT"); // students only
  // A session counts as completed once it has taken place — a review is optional,
  // not required (so ended-but-unreviewed sessions still count).
  const completed = base.filter((s) => s.status === "COMPLETED" || isEndedApproved(s));
  // Full history of past/terminal sessions (completed, mentor-declined,
  // cancelled/payment-declined, and approved sessions that already took place).
  const history = base.filter(
    (s) => ["COMPLETED", "REJECTED", "CANCELLED"].includes(s.status) || isEndedApproved(s)
  );

  const SessionCard = ({ session }: { session: Session }) => {
    const config = STATUS_CONFIG[session.status] || STATUS_CONFIG.COMPLETED;
    const otherRemoved = isMentor ? session.studentRemoved : session.mentorRemoved;
    const otherParty = (isMentor ? session.studentName : session.mentorName) || "Former member";
    const otherInitials = otherParty.split(" ").map((n) => n[0]).join("").slice(0, 2) || "?";
    const timing = getSessionTiming(session);
    const isLive = session.status === "APPROVED" && timing.isOngoing;

    return (
      <Card className="border-border hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12 border-2 border-border shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary">{otherInitials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-foreground">{otherParty}</p>
                  <p className="text-sm text-muted-foreground truncate">{session.topic}</p>
                  {otherRemoved && (
                    <p className="text-xs text-amber-600 mt-0.5">
                      {isMentor ? "This student has left Karigar." : "This mentor has left Karigar."}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {isLive && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-500 text-white flex items-center gap-1">
                      <span className="h-1.5 w-1.5 bg-white rounded-full animate-pulse" />Ongoing
                    </span>
                  )}
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${config.color}`}>
                    {config.label}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{session.date}</span>
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatTime12h(session.time)}</span>
                <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{session.packageName || session.type}</span>
                {/* Mentors never see the amount — only the session details. */}
                {!isMentor && <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />Rs {session.amount.toLocaleString()}</span>}
              </div>
            </div>
          </div>

          {(session.status === "REJECTED" || session.status === "CANCELLED") && session.rejectionReason && (
            <div className="mt-3 text-sm bg-red-50 text-red-700 rounded-lg p-3">
              <strong>{session.status === "REJECTED" ? "Mentor's reason:" : "Reason:"}</strong> {session.rejectionReason}
            </div>
          )}

          {session.status === "RESCHEDULE_REQUESTED" && (
            <div className="mt-3 text-sm bg-orange-50 text-orange-800 rounded-lg p-3 space-y-1">
              <p><strong>New time proposed:</strong> {session.proposedDate} at {formatTime12h(session.proposedTime)}</p>
              {session.rescheduleReason && <p><strong>Reason:</strong> {session.rescheduleReason}</p>}
              {isMentor && <p className="text-xs text-orange-600">Waiting for the student to accept or decline.</p>}
            </div>
          )}

          <div className="flex gap-2 mt-4 justify-end">
            {!isMentor && session.status === "RESCHEDULE_REQUESTED" && (
              <>
                <Button size="sm" variant="outline" className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
                  disabled={busyId === session.id} onClick={() => respondReschedule(session.id, false)}>
                  <XCircle className="h-4 w-4" />Decline
                </Button>
                <Button size="sm" variant="action" className="gap-1"
                  disabled={busyId === session.id} onClick={() => respondReschedule(session.id, true)}>
                  {busyId === session.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Accept New Time
                </Button>
              </>
            )}
            {session.status === "PENDING_PAYMENT" && (
              <>
                <Button size="sm" variant="outline" className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => setCancelId(session.id)}>
                  <XCircle className="h-4 w-4" />Cancel
                </Button>
                <Link to={`/payment/${session.id}`}>
                  <Button size="sm" variant="action" className="gap-1">
                    <DollarSign className="h-4 w-4" />Proceed to Payment
                  </Button>
                </Link>
              </>
            )}
            {session.status === "APPROVED" && (
              <>
                <Link to={`/session/${session.id}`}>
                  <Button size="sm" variant="outline" className="gap-1">View</Button>
                </Link>
                {/* Join only while the session hasn't ended yet. Once it's over the
                    session moves to History and the call can no longer be joined. */}
                {!timing.hasEnded && (
                  <Link to={`/session/${session.id}/call`} title={isLive ? "Join now" : "Becomes active 15 minutes before the session"}>
                    <Button
                      size="sm"
                      variant="action"
                      className={`gap-1 transition-all ${isLive ? "" : "opacity-40 grayscale hover:opacity-60"}`}
                    >
                      <Video className="h-4 w-4" />{isLive ? "Join Now" : "Join Call"}
                    </Button>
                  </Link>
                )}
              </>
            )}
            {!isMentor && !session.reviewed &&
              (session.status === "COMPLETED" || (session.status === "APPROVED" && timing.hasEnded)) && (
                <Button size="sm" variant="action" className="gap-1" onClick={() => setRatingSession(session)}>
                  <Star className="h-4 w-4" />Rate Session
                </Button>
              )}
            {/* Mentor: view the student's review for this session. */}
            {isMentor && session.reviewed && <SessionReviewButton sessionId={session.id} />}
            {/* Student: their own session already reviewed. */}
            {!isMentor && session.status === "COMPLETED" && session.reviewed && (
              <span className="text-xs text-green-600 flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-warning text-warning" />Reviewed</span>
            )}
          </div>
        </CardContent>
      </Card>
    );
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
        {/* Header Section */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">My Sessions</h1>
          <p className="text-muted-foreground">
            Manage your mentoring sessions and track your progress
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: "Upcoming", value: upcoming.length, icon: Calendar, color: "text-primary", bg: "bg-primary/10" },
            ...(!isMentor ? [{ label: "Pending Payment", value: pending.length, icon: DollarSign, color: "text-yellow-600", bg: "bg-yellow-50" }] : []),
            { label: "Completed", value: completed.length, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label} className="border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-xl ${bg}`}><Icon className={`h-5 w-5 ${color}`} /></div>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold text-foreground">{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={isMentor ? "Search by student name…" : "Search by mentor name…"}
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="upcoming">
          <TabsList className={`grid ${isMentor ? "grid-cols-2" : "grid-cols-3"} w-full max-w-md`}>
            <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
            {!isMentor && <TabsTrigger value="pending">Payment ({pending.length})</TabsTrigger>}
            <TabsTrigger value="history">History ({history.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-3">
            {upcoming.length === 0 ? (
              <Card className="border-border"><CardContent className="py-12 text-center text-muted-foreground">No upcoming sessions</CardContent></Card>
            ) : upcoming.map((s) => <SessionCard key={s.id} session={s} />)}
          </TabsContent>

          {!isMentor && (
            <TabsContent value="pending" className="space-y-3">
              {pending.length === 0 ? (
                <Card className="border-border"><CardContent className="py-12 text-center text-muted-foreground">No sessions awaiting payment</CardContent></Card>
              ) : pending.map((s) => <SessionCard key={s.id} session={s} />)}
            </TabsContent>
          )}

          <TabsContent value="history" className="space-y-3">
            {history.length === 0 ? (
              <Card className="border-border"><CardContent className="py-12 text-center text-muted-foreground">No past sessions yet</CardContent></Card>
            ) : history.map((s) => <SessionCard key={s.id} session={s} />)}
          </TabsContent>
        </Tabs>
      </main>

      {ratingSession && (
        <RatingDialog
          open={!!ratingSession}
          onOpenChange={(o) => { if (!o) setRatingSession(null); }}
          sessionId={ratingSession.id}
          mentorName={ratingSession.mentorName}
          onSubmitted={reload}
        />
      )}

      {/* Cancel-booking confirmation */}
      <Dialog open={!!cancelId} onOpenChange={(o) => { if (!o) setCancelId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this booking?</DialogTitle>
            <DialogDescription>
              This will remove the session request. You won't be charged, and you can book again any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelId(null)} disabled={!!busyId}>
              Keep Booking
            </Button>
            <Button variant="destructive" onClick={confirmCancel} disabled={!!busyId} className="gap-1">
              {busyId ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Cancel Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Sessions;
