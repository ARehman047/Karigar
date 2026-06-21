// Google Calendar integration — auto-add confirmed sessions to each participant's
// calendar (so the calendar handles reminders/notifications).
//
// Uses the OAuth 2.0 authorization-code flow with offline access to obtain a
// long-lived refresh token per user, then calls the Calendar REST API on their
// behalf. Requires: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and a registered
// redirect URI (SERVER_URL + /api/auth/google/calendar/callback).

import { OAuth2Client } from "google-auth-library";

const CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "openid",
  "email",
  "profile",
];

const CALENDAR_API = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const PK_OFFSET = "+05:00"; // sessions are scheduled in Pakistan time (Asia/Karachi)
const PK_TZ = "Asia/Karachi";

export const isCalendarConfigured = (): boolean =>
  !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

const getRedirectUri = (): string =>
  `${(process.env.SERVER_URL || "http://localhost:5000").replace(/\/$/, "")}/api/auth/google/calendar/callback`;

const getClient = (): OAuth2Client =>
  new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, getRedirectUri());

// Consent URL the user is sent to. `state` round-trips the user id (signed).
export const buildCalendarAuthUrl = (state: string): string =>
  getClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // force a refresh_token every time
    scope: CALENDAR_SCOPES,
    state,
    include_granted_scopes: true,
  });

// Exchange the authorization code for a refresh token + the connected email.
export const exchangeCalendarCode = async (
  code: string
): Promise<{ refreshToken?: string; email?: string }> => {
  const client = getClient();
  const { tokens } = await client.getToken(code);
  let email: string | undefined;
  if (tokens.id_token) {
    try {
      const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: process.env.GOOGLE_CLIENT_ID });
      email = ticket.getPayload()?.email || undefined;
    } catch {
      /* email is best-effort */
    }
  }
  return { refreshToken: tokens.refresh_token || undefined, email };
};

// Mint a fresh access token from a stored refresh token.
const getAccessToken = async (refreshToken: string): Promise<string> => {
  const client = getClient();
  client.setCredentials({ refresh_token: refreshToken });
  const { token } = await client.getAccessToken();
  if (!token) throw new Error("Could not obtain Google access token.");
  return token;
};

// ── Event timing ───────────────────────────────────────────────
// session.date = "YYYY-MM-DD", session.time = "HH:MM-HH:MM" (or single "HH:MM").
const sessionTimes = (date: string, time: string, duration = 60): { start: string; end: string } => {
  const range = String(time || "").match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  let startHHMM: string;
  let endHHMM: string;
  if (range) {
    startHHMM = `${range[1].padStart(2, "0")}:${range[2]}`;
    endHHMM = `${range[3].padStart(2, "0")}:${range[4]}`;
  } else {
    const s = String(time || "").match(/(\d{1,2}):(\d{2})/);
    startHHMM = s ? `${s[1].padStart(2, "0")}:${s[2]}` : "09:00";
    const [h, m] = startHHMM.split(":").map(Number);
    const total = h * 60 + m + (duration || 60);
    endHHMM = `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }
  return {
    start: `${date}T${startHHMM}:00${PK_OFFSET}`,
    end: `${date}T${endHHMM}:00${PK_OFFSET}`,
  };
};

export interface CalendarEventInput {
  topic: string;
  date: string;
  time: string;
  duration?: number;
  otherPartyName: string;
  meetingLink?: string;
}

const buildEventResource = (input: CalendarEventInput) => {
  const { start, end } = sessionTimes(input.date, input.time, input.duration);
  const lines = [
    `Your Karigar mentorship session with ${input.otherPartyName}.`,
    "",
    `Topic: ${input.topic}`,
  ];
  if (input.meetingLink) lines.push(`Join the call: ${input.meetingLink}`);
  lines.push("", "Scheduled via Karigar.");
  return {
    summary: `Karigar Session: ${input.topic}`,
    description: lines.join("\n"),
    location: input.meetingLink || "Karigar (online)",
    start: { dateTime: start, timeZone: PK_TZ },
    end: { dateTime: end, timeZone: PK_TZ },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email", minutes: 24 * 60 }, // 1 day before (email)
        { method: "popup", minutes: 60 }, // 1 hour before
        { method: "popup", minutes: 10 }, // 10 minutes before
      ],
    },
  };
};

// Create an event on the user's primary calendar. Returns the event id.
export const createCalendarEvent = async (refreshToken: string, input: CalendarEventInput): Promise<string> => {
  const accessToken = await getAccessToken(refreshToken);
  const res = await fetch(CALENDAR_API, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(buildEventResource(input)),
  });
  if (!res.ok) throw new Error(`Calendar create failed (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as { id: string };
  return data.id;
};

// Update an existing event (e.g. after a reschedule).
export const updateCalendarEvent = async (
  refreshToken: string,
  eventId: string,
  input: CalendarEventInput
): Promise<void> => {
  const accessToken = await getAccessToken(refreshToken);
  const res = await fetch(`${CALENDAR_API}/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(buildEventResource(input)),
  });
  if (!res.ok) throw new Error(`Calendar update failed (${res.status}): ${await res.text()}`);
};

// Remove an event (e.g. session cancelled).
export const deleteCalendarEvent = async (refreshToken: string, eventId: string): Promise<void> => {
  const accessToken = await getAccessToken(refreshToken);
  const res = await fetch(`${CALENDAR_API}/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  // 410 = already deleted — treat as success.
  if (!res.ok && res.status !== 410 && res.status !== 404) {
    throw new Error(`Calendar delete failed (${res.status}): ${await res.text()}`);
  }
};
