import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Clock } from "lucide-react";

// Availability is stored as strings like "Mon 09:00-10:00".
// Sessions are fixed at one hour, so each slot's end is always start + 60 min.
const DAYS: { abbr: string; full: string }[] = [
  { abbr: "Mon", full: "Monday" },
  { abbr: "Tue", full: "Tuesday" },
  { abbr: "Wed", full: "Wednesday" },
  { abbr: "Thu", full: "Thursday" },
  { abbr: "Fri", full: "Friday" },
  { abbr: "Sat", full: "Saturday" },
  { abbr: "Sun", full: "Sunday" },
];

interface Slot {
  day: string;
  start: string;
  end: string;
}

// Add 60 minutes to an "HH:MM" time → "HH:MM".
const addOneHour = (t: string): string => {
  const [h, m] = String(t).split(":").map((n) => Number(n) || 0);
  const total = (h * 60 + m + 60) % (24 * 60);
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
};

const parse = (value: string[]): Slot[] =>
  value
    .map((s) => {
      const [day, range] = String(s).split(" ");
      const [start] = String(range || "").split("-");
      const st = start || "09:00";
      return { day, start: st, end: addOneHour(st) }; // enforce 1-hour length
    })
    .filter((s) => DAYS.some((d) => d.abbr === s.day));

const serialize = (slots: Slot[]): string[] => slots.map((s) => `${s.day} ${s.start}-${s.end}`);

export interface AvailabilityEditorProps {
  value: string[];
  onChange: (slots: string[]) => void;
}

export const AvailabilityEditor = ({ value, onChange }: AvailabilityEditorProps) => {
  const slots = parse(value);
  const update = (next: Slot[]) => onChange(serialize(next));
  // Changing the start time auto-sets the end to start + 1 hour.
  const setStart = (i: number, val: string) =>
    update(slots.map((s, idx) => (idx === i ? { ...s, start: val, end: addOneHour(val) } : s)));
  const remove = (i: number) => update(slots.filter((_, idx) => idx !== i));
  const add = (day: string) => update([...slots, { day, start: "09:00", end: addOneHour("09:00") }]);

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Each slot is a <strong>1-hour</strong> session. Pick a start time and the end fills in automatically.</p>
      {DAYS.map(({ abbr, full }) => {
        const daySlots = slots.map((s, i) => ({ s, i })).filter((x) => x.s.day === abbr);
        const enabled = daySlots.length > 0;
        return (
          <div key={abbr} className={`rounded-lg border p-3 transition-colors ${enabled ? "border-primary/30 bg-primary/5" : "border-border"}`}>
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm text-foreground">{full}</span>
              <Button type="button" size="sm" variant="ghost" className="gap-1 h-7 text-primary" onClick={() => add(abbr)}>
                <Plus className="h-3.5 w-3.5" />Add 1-hour slot
              </Button>
            </div>
            {!enabled ? (
              <p className="text-xs text-muted-foreground mt-1">Not available — add a slot to let students book this day.</p>
            ) : (
              <div className="space-y-2 mt-2">
                {daySlots.map(({ s, i }) => (
                  <div key={i} className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <Input type="time" value={s.start} onChange={(e) => setStart(i, e.target.value)} className="w-28 h-9" />
                    <span className="text-xs text-muted-foreground">→ {s.end}</span>
                    <span className="text-xs text-muted-foreground">(1 hr)</span>
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8 ml-auto text-muted-foreground hover:text-red-500" onClick={() => remove(i)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
