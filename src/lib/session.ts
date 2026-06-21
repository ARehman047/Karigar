import type { Session } from "@/types";

// Format a stored time ("HH:MM" or a range "HH:MM-HH:MM") into 12-hour AM/PM.
export const formatTime12h = (time?: string): string => {
  if (!time) return "";
  const one = (t: string): string => {
    const m = t.trim().match(/(\d{1,2}):(\d{2})/);
    if (!m) return t.trim();
    let h = Number(m[1]);
    const ap = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${m[2]} ${ap}`;
  };
  return time.includes("-") ? time.split("-").map(one).join(" – ") : one(time);
};

// A session becomes "ongoing" (joinable) once its start time arrives (with a
// small early lead) and stays joinable until it ends. The Join button is
// disabled outside this window.
const EARLY_LEAD_MS = 15 * 60 * 1000; // allow joining 15 min early

export interface SessionTiming {
  start: Date;
  end: Date;
  isOngoing: boolean; // within [start - lead, end]
  hasEnded: boolean;
  startsInMs: number; // ms until start (negative once started)
}

export const getSessionTiming = (session: Pick<Session, "date" | "time" | "duration">): SessionTiming => {
  // `time` may be a single "HH:MM" or a range like "15:00-17:00" — take the start.
  const match = String(session.time || "").match(/(\d{1,2}):(\d{2})/);
  const hh = match ? match[1].padStart(2, "0") : "00";
  const mm = match ? match[2] : "00";
  const start = new Date(`${session.date}T${hh}:${mm}:00`);
  const durationMin = session.duration || 60;
  const end = new Date(start.getTime() + durationMin * 60 * 1000);
  const now = new Date();

  const valid = !isNaN(start.getTime());
  const isOngoing = valid && now.getTime() >= start.getTime() - EARLY_LEAD_MS && now.getTime() <= end.getTime();
  const hasEnded = valid && now.getTime() > end.getTime();
  const startsInMs = valid ? start.getTime() - now.getTime() : Number.POSITIVE_INFINITY;

  return { start, end, isOngoing, hasEnded, startsInMs };
};
