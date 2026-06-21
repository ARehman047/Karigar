// Builds an RFC-5545 iCalendar (.ics) invite for a session, with reminders
// (VALARM). Emailed as an attachment so users who haven't connected Google
// Calendar can still add the session to any calendar app (Gmail auto-detects it).

export interface ICSInput {
  uid: string; // stable per session so updates replace rather than duplicate
  sequence: number; // increment on each change (reschedule) so clients update
  summary: string;
  description: string;
  location: string;
  start: Date;
  end: Date;
  organizerName: string;
  organizerEmail: string;
  attendeeName: string;
  attendeeEmail: string;
  method?: "REQUEST" | "CANCEL";
}

// → "20260620T040000Z" (UTC basic format)
const toICSDate = (d: Date): string => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

// Escape per RFC 5545 (commas, semicolons, backslashes, newlines).
const esc = (s: string): string =>
  String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

export const buildICS = (i: ICSInput): string => {
  const method = i.method || "REQUEST";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Karigar//Mentorship//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${method}`,
    "BEGIN:VEVENT",
    `UID:${i.uid}`,
    `SEQUENCE:${i.sequence}`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(i.start)}`,
    `DTEND:${toICSDate(i.end)}`,
    `SUMMARY:${esc(i.summary)}`,
    `DESCRIPTION:${esc(i.description)}`,
    `LOCATION:${esc(i.location)}`,
    `ORGANIZER;CN=${esc(i.organizerName)}:mailto:${i.organizerEmail}`,
    `ATTENDEE;CN=${esc(i.attendeeName)};RSVP=TRUE:mailto:${i.attendeeEmail}`,
    `STATUS:${method === "CANCEL" ? "CANCELLED" : "CONFIRMED"}`,
    // Reminders: 1 day, 1 hour, and 10 minutes before.
    "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", "DESCRIPTION:Karigar session reminder", "END:VALARM",
    "BEGIN:VALARM", "TRIGGER:-PT1H", "ACTION:DISPLAY", "DESCRIPTION:Karigar session reminder", "END:VALARM",
    "BEGIN:VALARM", "TRIGGER:-PT10M", "ACTION:DISPLAY", "DESCRIPTION:Karigar session reminder", "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
};
