import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { sessionApi } from "@/lib/services";
import { Session } from "@/types";
import { getSessionTiming, formatTime12h } from "@/lib/session";
import { useToast } from "@/hooks/use-toast";
import {
  Video, ArrowLeft, Calendar, Clock, User, BookOpen, Package, DollarSign,
  Loader2, CheckCircle2, MessageSquare,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING_PAYMENT: { label: "Pending Payment", color: "bg-yellow-100 text-yellow-700" },
  PENDING_ADMIN_CONFIRMATION: { label: "Verifying Payment", color: "bg-amber-100 text-amber-700" },
  PENDING_MENTOR_APPROVAL: { label: "Awaiting Mentor", color: "bg-blue-100 text-blue-700" },
  APPROVED: { label: "Approved", color: "bg-green-100 text-green-700" },
  REJECTED: { label: "Declined", color: "bg-red-100 text-red-700" },
  RESCHEDULE_REQUESTED: { label: "Reschedule Requested", color: "bg-orange-100 text-orange-700" },
  COMPLETED: { label: "Completed", color: "bg-gray-100 text-gray-600" },
  CANCELLED: { label: "Cancelled", color: "bg-red-50 text-red-400" },
};

const SessionRoom = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const isMentor = user?.role === "mentor";

  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Re-render every 30s so the Join button activates when the session starts.
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!sessionId) {
      setIsLoading(false);
      return;
    }
    let active = true;
    sessionApi
      .get(sessionId)
      .then((data) => active && setSession(data))
      .catch((err) => toast({ title: "Failed to load session", description: err.message, variant: "destructive" }))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [sessionId, toast]);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

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

  if (!session) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="py-24 text-center space-y-4">
          <h1 className="text-2xl font-bold">Session Not Found</h1>
          <Button asChild><Link to="/sessions">Back to Sessions</Link></Button>
        </div>
      </div>
    );
  }

  const otherParty = isMentor ? session.studentName : session.mentorName;
  const otherInitials = otherParty.split(" ").map((n) => n[0]).join("").slice(0, 2);
  const statusCfg = STATUS_CONFIG[session.status] || STATUS_CONFIG.PENDING_PAYMENT;
  const timing = getSessionTiming(session);
  const canJoin = session.status === "APPROVED" && timing.isOngoing;

  const Row = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) => (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <span className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className="h-4 w-4" />{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 lg:px-8 py-8 max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild className="text-muted-foreground">
            <Link to="/sessions"><ArrowLeft className="mr-2 h-4 w-4" />Back to Sessions</Link>
          </Button>
          <div className="flex items-center gap-2">
            {canJoin && (
              <Badge className="bg-red-500 text-white gap-1 animate-pulse">
                <span className="h-1.5 w-1.5 bg-white rounded-full" />Ongoing
              </Badge>
            )}
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusCfg.color}`}>{statusCfg.label}</span>
          </div>
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-xl">Session Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 pb-4 mb-2 border-b border-border">
              <Avatar className="h-14 w-14 border-2 border-primary">
                <AvatarFallback className="bg-primary/10 text-primary text-lg">{otherInitials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-foreground">{otherParty}</p>
                <p className="text-sm text-muted-foreground">{isMentor ? "Student" : "Mentor"}</p>
              </div>
            </div>

            <Row icon={BookOpen} label="Topic" value={session.topic} />
            {session.packageName && <Row icon={Package} label="Package / Type" value={session.packageName} />}
            <Row icon={Video} label="Session Type" value={<span className="capitalize">{session.type}</span>} />
            <Row icon={Calendar} label="Date" value={session.date} />
            <Row icon={Clock} label="Time" value={`${formatTime12h(session.time)} • ${session.duration} min`} />
            <Row icon={User} label={isMentor ? "Student" : "Mentor"} value={otherParty} />
            {/* The mentor never sees the amount — only students do. */}
            {!isMentor && <Row icon={DollarSign} label="Amount Paid" value={`Rs ${session.amount.toLocaleString()}`} />}

            {session.message && (
              <div className="mt-4 p-3 bg-muted/40 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1"><MessageSquare className="h-3 w-3" />Note from {isMentor ? "student" : "you"}</p>
                <p className="text-sm text-foreground italic">"{session.message}"</p>
              </div>
            )}

            {session.status === "REJECTED" && session.rejectionReason && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                <strong>Decline reason:</strong> {session.rejectionReason}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Join — only for an approved session, enabled once it's ongoing */}
        {session.status === "APPROVED" && (
          <Card className="border-border">
            <CardContent className="p-5 text-center space-y-3">
              {timing.hasEnded ? (
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> This session has ended.
                </p>
              ) : (
                <>
                  {canJoin && <p className="text-sm text-green-700 font-medium">Your session is live — join now.</p>}
                  {/* Blurred/"inactive" look until 15 min before start, but still
                      clickable so the call can be tested anytime. */}
                  <Button
                    asChild
                    variant="action"
                    size="lg"
                    className={`gap-2 transition-all ${canJoin ? "" : "opacity-40 grayscale hover:opacity-60"}`}
                  >
                    <Link to={`/session/${session.id}/call`}>
                      <Video className="h-5 w-5" />Join Video Call
                    </Link>
                  </Button>
                  {!canJoin && (
                    <p className="text-xs text-muted-foreground">
                      Activates 15 minutes before — scheduled for {session.date} at {formatTime12h(session.time)}.
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default SessionRoom;
