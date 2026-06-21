import { useState, useRef, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { sessionApi } from "@/lib/services";
import { Session } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { RatingDialog } from "@/components/session/RatingDialog";
import { cn } from "@/lib/utils";
import {
  Loader2, Video, VideoOff, Mic, MicOff, MonitorUp, MessageSquare,
  LayoutGrid, PhoneOff, GraduationCap,
} from "lucide-react";

interface CallConfig {
  provider: string;
  domain: string;
  appId: string | null;
  room: string;
  token: string | null;
}

const loadJitsiScript = (src: string): Promise<void> =>
  new Promise((resolve, reject) => {
    if ((window as unknown as { JitsiMeetExternalAPI?: unknown }).JitsiMeetExternalAPI) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load video library"));
    document.body.appendChild(s);
  });

// A single circular control button with an icon + small label.
const Control = ({
  onClick, label, title, icon, variant = "glass", badge, dim,
}: {
  onClick: () => void;
  label: string;
  title?: string;
  icon: React.ReactNode;
  variant?: "glass" | "danger" | "primary" | "action";
  badge?: number;
  dim?: boolean;
}) => {
  const styles: Record<string, string> = {
    glass: "bg-white/10 text-white hover:bg-white/20",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30",
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/30",
    action: "bg-action text-action-foreground hover:bg-action/90 shadow-lg shadow-action/30",
  };
  return (
    <button onClick={onClick} title={title || label} className={cn("group flex flex-col items-center gap-1.5", dim && "opacity-50")}>
      <span className={cn("relative h-12 w-12 rounded-full flex items-center justify-center transition-all duration-200 group-hover:scale-110 group-active:scale-95", styles[variant])}>
        {icon}
        {!!badge && badge > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-action text-action-foreground text-[10px] font-bold flex items-center justify-center">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>
      <span className="text-[11px] font-medium text-zinc-300">{label}</span>
    </button>
  );
};

const SessionCall = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [session, setSession] = useState<Session | null>(null);
  const [callConfig, setCallConfig] = useState<CallConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [showConnecting, setShowConnecting] = useState(true);
  const [ended, setEnded] = useState(false);
  const [showRating, setShowRating] = useState(false);

  // Live call state (mirrored from Jitsi events).
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [micAvailable, setMicAvailable] = useState(true);
  const [camAvailable, setCamAvailable] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [tileView, setTileView] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [seconds, setSeconds] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiRef = useRef<any>(null);
  const syncMediaRef = useRef<(() => void) | null>(null);

  const isMentor = user?.role === "mentor";

  useEffect(() => {
    if (!sessionId) {
      setIsLoading(false);
      return;
    }
    let active = true;
    Promise.all([sessionApi.get(sessionId), sessionApi.getCallConfig(sessionId)])
      .then(([data, cfg]) => {
        if (!active) return;
        setSession(data);
        setCallConfig(cfg as CallConfig);
      })
      .catch((err) => toast({ title: "Couldn't open call", description: err.message, variant: "destructive" }))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [sessionId, toast]);

  // Call timer (runs once joined).
  useEffect(() => {
    if (!joined) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [joined]);

  // Mount the meeting once session + config are ready.
  useEffect(() => {
    if (!session || !callConfig || !containerRef.current) return;
    let disposed = false;
    const cleanupTimers: ReturnType<typeof setTimeout>[] = [];

    const handleEnd = () => {
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
      setEnded(true);
      if (!isMentor && !session.reviewed) setShowRating(true);
      else navigate(`/session/${session.id}`);
    };

    const isJaas = callConfig.provider === "jaas" && callConfig.appId;
    const scriptSrc = isJaas
      ? `https://${callConfig.domain}/${callConfig.appId}/external_api.js`
      : `https://${callConfig.domain}/external_api.js`;
    const roomName = isJaas ? `${callConfig.appId}/${callConfig.room}` : callConfig.room;

    loadJitsiScript(scriptSrc)
      .then(() => {
        if (disposed) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const JitsiMeetExternalAPI = (window as any).JitsiMeetExternalAPI;
        const api = new JitsiMeetExternalAPI(callConfig.domain, {
          roomName,
          jwt: callConfig.token || undefined,
          parentNode: containerRef.current,
          userInfo: { displayName: user?.name || "Karigar User" },
          configOverwrite: {
            prejoinPageEnabled: false,
            disableModeratorIndicator: true,
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            toolbarButtons: [], // hide Jitsi's toolbar — we use our own controls
            disableShortcuts: false,
            hideConferenceSubject: true,
            hideConferenceTimer: true,
          },
          interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: [],
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            MOBILE_APP_PROMO: false,
            HIDE_INVITE_MORE_HEADER: true,
            DISABLE_FOCUS_INDICATOR: true,
          },
        });
        apiRef.current = api;

        // Safety net: never let the "Connecting…" overlay hide the call surface
        // for more than a few seconds (e.g. if a permission/device prompt is shown).
        const safety = setTimeout(() => setShowConnecting(false), 4000);
        cleanupTimers.push(safety);

        // Read the TRUE mic/cam state + device availability from Jitsi
        // (events alone can be unreliable, and a muted-vs-no-device distinction matters).
        const syncMedia = () => {
          if (api.isAudioMuted) api.isAudioMuted().then((m: boolean) => setMicOn(!m)).catch(() => {});
          if (api.isVideoMuted) api.isVideoMuted().then((m: boolean) => setCamOn(!m)).catch(() => {});
          if (api.isAudioAvailable) api.isAudioAvailable().then((a: boolean) => setMicAvailable(!!a)).catch(() => {});
          if (api.isVideoAvailable) api.isVideoAvailable().then((a: boolean) => setCamAvailable(!!a)).catch(() => {});
        };
        syncMediaRef.current = syncMedia;

        api.addEventListener("videoConferenceJoined", () => {
          setJoined(true);
          setShowConnecting(false);
          // Devices can take a moment to attach; poll a few times after join.
          [600, 1500, 3000].forEach((ms) => cleanupTimers.push(setTimeout(syncMedia, ms)));
        });
        api.addEventListener("audioAvailabilityChanged", (e: { available: boolean }) => setMicAvailable(!!e.available));
        api.addEventListener("videoAvailabilityChanged", (e: { available: boolean }) => setCamAvailable(!!e.available));
        api.addEventListener("readyToClose", handleEnd);
        api.addEventListener("videoConferenceLeft", handleEnd);
        api.addEventListener("audioMuteStatusChanged", (e: { muted: boolean }) => setMicOn(!e.muted));
        api.addEventListener("videoMuteStatusChanged", (e: { muted: boolean }) => setCamOn(!e.muted));
        api.addEventListener("screenSharingStatusChanged", (e: { on: boolean }) => setSharing(!!e.on));
        api.addEventListener("tileViewChanged", (e: { enabled: boolean }) => setTileView(!!e.enabled));
        api.addEventListener("chatUpdated", (e: { isOpen: boolean; unreadCount: number }) => {
          setChatOpen(!!e.isOpen);
          setUnread(e.unreadCount || 0);
        });
      })
      .catch((err) => toast({ title: "Video failed to load", description: (err as Error).message, variant: "destructive" }));

    return () => {
      disposed = true;
      cleanupTimers.forEach(clearTimeout);
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, callConfig]);

  const cmd = (c: string) => apiRef.current?.executeCommand(c);
  // For mic/cam: flip the UI instantly (optimistic), fire the toggle, then
  // re-read Jitsi's real state so the button reflects what ACTUALLY happened.
  const toggleAudio = () => {
    if (!apiRef.current) return;
    if (!micAvailable) {
      toast({
        title: "Microphone unavailable",
        description: "No mic was detected, access was blocked, or it's in use by another app/tab. Allow microphone access (or close the other tab using it) and rejoin.",
        variant: "destructive",
      });
      return;
    }
    setMicOn((v) => !v);
    apiRef.current.executeCommand("toggleAudio");
    setTimeout(() => syncMediaRef.current?.(), 400);
  };
  const toggleVideo = () => {
    if (!apiRef.current) return;
    if (!camAvailable) {
      toast({
        title: "Camera unavailable",
        description: "No camera was detected, access was blocked, or it's in use by another app/tab. Allow camera access (or close the other tab using it) and rejoin.",
        variant: "destructive",
      });
      return;
    }
    setCamOn((v) => !v);
    apiRef.current.executeCommand("toggleVideo");
    setTimeout(() => syncMediaRef.current?.(), 400);
  };
  const duration = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  if (isLoading) {
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">Call not available</h1>
          <Button asChild><Link to="/sessions">Back to Sessions</Link></Button>
        </div>
      </div>
    );
  }

  const otherParty = isMentor ? session.studentName : session.mentorName;

  if (ended) {
    return (
      <>
        <div className="h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex flex-col items-center justify-center gap-4 text-center px-4">
          <div className="p-4 rounded-2xl bg-white/5"><PhoneOff className="h-10 w-10 text-zinc-400" /></div>
          <h1 className="text-2xl font-bold text-white">Call ended</h1>
          <p className="text-zinc-400">Thanks for using Karigar.</p>
          <Button asChild variant="action"><Link to="/sessions">Back to Sessions</Link></Button>
        </div>
        <RatingDialog
          open={showRating}
          onOpenChange={(o) => { setShowRating(o); if (!o) navigate("/sessions"); }}
          sessionId={session.id}
          mentorName={session.mentorName}
          onSubmitted={() => navigate("/sessions")}
        />
      </>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-950 overflow-hidden">
      {/* Branded header */}
      <header className="flex items-center justify-between px-4 py-3 bg-zinc-900/80 backdrop-blur-md border-b border-white/10 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span className="font-semibold text-white hidden sm:inline">Karigar</span>
          </div>
          <div className="h-6 w-px bg-white/10 hidden sm:block" />
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{session.topic}</p>
            <p className="text-zinc-400 text-xs truncate">with {otherParty}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-red-500/15 border border-red-500/30 px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-red-300 text-xs font-semibold tabular-nums">{joined ? duration : "Live"}</span>
        </div>
      </header>

      {/* Video stage */}
      <div className="flex-1 relative bg-zinc-900">
        <div ref={containerRef} className="absolute inset-0" />
        {showConnecting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-900 pointer-events-none z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-zinc-400 text-sm">Connecting you to {otherParty}…</p>
          </div>
        )}
      </div>

      {/* Custom themed control bar */}
      <footer className="bg-zinc-900/90 backdrop-blur-md border-t border-white/10 py-4 px-4">
        <div className="flex items-end justify-center gap-5 sm:gap-7">
          <Control
            onClick={toggleAudio}
            dim={!micAvailable}
            label={!micAvailable ? "No mic" : micOn ? "Mute" : "Unmute"}
            variant={!micAvailable || !micOn ? "danger" : "glass"}
            icon={micOn && micAvailable ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          />
          <Control
            onClick={toggleVideo}
            dim={!camAvailable}
            label={!camAvailable ? "No camera" : camOn ? "Stop video" : "Start video"}
            variant={!camAvailable || !camOn ? "danger" : "glass"}
            icon={camOn && camAvailable ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          />
          <Control
            onClick={() => cmd("toggleShareScreen")}
            label="Share"
            variant={sharing ? "action" : "glass"}
            icon={<MonitorUp className="h-5 w-5" />}
          />
          <Control
            onClick={() => cmd("toggleChat")}
            label="Chat"
            variant={chatOpen ? "primary" : "glass"}
            badge={unread}
            icon={<MessageSquare className="h-5 w-5" />}
          />
          <Control
            onClick={() => cmd("toggleTileView")}
            label="Grid"
            variant={tileView ? "primary" : "glass"}
            icon={<LayoutGrid className="h-5 w-5" />}
          />
          <Control
            onClick={() => cmd("hangup")}
            label="Leave"
            variant="danger"
            icon={<PhoneOff className="h-5 w-5" />}
          />
        </div>
      </footer>
    </div>
  );
};

export default SessionCall;
