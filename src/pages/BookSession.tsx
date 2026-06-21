import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar,
  Clock,
  Star,
  CheckCircle2,
  MapPin,
  Check,
  CreditCard,
  Sparkles,
  FileText,
  MessageSquare,
  Users,
  Loader2,
} from "lucide-react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { mentorApi, sessionApi } from "@/lib/services";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { format } from "date-fns";
import type { Mentor } from "@/types";
import { PACKAGES } from "@/lib/pricing";

// Icon per service for the package picker.
const PACKAGE_ICONS: Record<string, React.ElementType> = {
  "Basic Career Consultation": MessageSquare,
  "Academic Mentorship": Sparkles,
  "Entrepreneurial Coaching Package": Sparkles,
  "CV/Resume Building": FileText,
  "Parental Guidance Sessions": Users,
};

const DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const BookSession = () => {
  const { mentorId } = useParams<{ mentorId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState("");
  const [sessionTopic, setSessionTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [showPackageDialog, setShowPackageDialog] = useState(false);

  useEffect(() => {
    if (!mentorId) return;
    setLoading(true);
    mentorApi
      .get(mentorId)
      .then((m) => setMentor(m))
      .catch((err) => {
        setMentor(null);
        toast({ title: "Failed to load mentor", description: err.message, variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, [mentorId, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!mentor) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center space-y-4">
          <h1 className="text-2xl font-bold">Mentor Not Found</h1>
          <Button asChild>
            <Link to="/mentors">Browse Mentors</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center space-y-4">
          <h1 className="text-2xl font-bold">Sign In Required</h1>
          <p className="text-muted-foreground">You need to sign in to book a session.</p>
          <Button variant="action" asChild>
            <Link to="/login">Sign In</Link>
          </Button>
        </div>
      </div>
    );
  }

  const initials = mentor.name.split(" ").map((n) => n[0]).join("");

  // Group the mentor's 1-hour slots by weekday.
  const slotsByDay: Record<string, string[]> = {};
  (mentor.availability || []).forEach((slot) => {
    const day = slot.split(" ")[0];
    if (!DAY_ORDER.includes(day)) return;
    (slotsByDay[day] ||= []).push(slot);
  });
  Object.values(slotsByDay).forEach((arr) => arr.sort());

  // Weekdays the mentor is available, as JS day indices (0=Sun … 6=Sat).
  const DAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const availableWeekdayIdx = new Set(
    Object.keys(slotsByDay).filter((d) => slotsByDay[d]?.length).map((d) => DAY_INDEX[d])
  );
  const hasAvailability = availableWeekdayIdx.size > 0;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  // Disable past dates and any weekday the mentor isn't available on.
  const isDateDisabled = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d < startOfToday || !availableWeekdayIdx.has(date.getDay());
  };

  // Time slots for the weekday of the chosen date.
  const abbrForIdx = (idx: number) => Object.keys(DAY_INDEX).find((k) => DAY_INDEX[k] === idx) || "";
  const selectedDayAbbr = selectedDate ? abbrForIdx(selectedDate.getDay()) : "";
  const timeSlotsForDate = selectedDayAbbr ? slotsByDay[selectedDayAbbr] || [] : [];

  // For today, a slot whose start time has already passed can't be booked.
  const now = new Date();
  const isToday = !!selectedDate && selectedDate.toDateString() === now.toDateString();
  const isSlotPast = (range: string): boolean => {
    if (!selectedDate || !isToday) return false;
    const m = range.split("-")[0].match(/(\d{1,2}):(\d{2})/);
    if (!m) return false;
    const slotStart = new Date(selectedDate);
    slotStart.setHours(Number(m[1]), Number(m[2]), 0, 0);
    return slotStart.getTime() <= now.getTime();
  };

  // 12-hour time formatting.
  const to12h = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const ap = h >= 12 ? "PM" : "AM";
    const hr = h % 12 || 12;
    return `${hr}:${String(m).padStart(2, "0")} ${ap}`;
  };
  const rangeTo12h = (range: string) => range.split("-").map(to12h).join(" – ");

  const canProceedToPayment = !!(selectedDate && selectedTime && sessionTopic);
  const isoDate = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const slotTime = selectedTime; // "HH:MM-HH:MM"
  const formattedDate = selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : "";

  const handleSelectPackage = async (pkg: { name: string; price: number }) => {
    if (!mentor || isCreating) return;
    if (selectedTime && isSlotPast(selectedTime)) {
      toast({ title: "Time already passed", description: "That slot is no longer available. Please pick another time.", variant: "destructive" });
      setSelectedTime("");
      return;
    }
    setIsCreating(true);
    try {
      const session = await sessionApi.create({
        mentorId: mentor.userId,
        date: isoDate,
        time: slotTime,
        duration: 60,
        topic: sessionTopic,
        type: "video",
        message: notes || undefined,
        amount: pkg.price,
        packageName: pkg.name,
      });
      setShowPackageDialog(false);
      navigate(`/payment/${session.id}`);
    } catch (err) {
      toast({
        title: "Could not create session",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Packages come from the canonical pricing config. Show only the services this
  // mentor offers (their specialities); if none set, show all.
  const offered = mentor?.specialities?.length
    ? PACKAGES.filter((p) => mentor.specialities!.includes(p.name))
    : PACKAGES;
  const packages = offered.map((p) => ({
    id: p.key,
    name: p.name,
    price: p.studentPrice,
    icon: PACKAGE_ICONS[p.name] || MessageSquare,
    description: p.description,
  }));

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 lg:px-8 py-8 space-y-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-foreground">Book a Session</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Mentor Summary */}
            <Card className="border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 border-2 border-primary">
                    <AvatarFallback className="bg-primary text-primary-foreground text-base">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg">{mentor.name}</h3>
                    <p className="text-sm text-muted-foreground">{mentor.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                      <span className="text-sm font-medium">{mentor.rating.toFixed(1)}</span>
                      <MapPin className="h-3 w-3 text-muted-foreground ml-1" />
                      <span className="text-xs text-muted-foreground">{mentor.city}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-action/30 bg-action/5">
              <CardContent className="p-4 flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-action shrink-0" />
                <p className="text-sm text-muted-foreground">
                  All sessions are conducted via <span className="font-semibold text-foreground">video call</span>. Choose your package after confirming.
                </p>
              </CardContent>
            </Card>

            {/* Pick a date (calendar) then a time */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4 text-action" />
                  Select a Date & Time
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!hasAvailability ? (
                  <p className="text-sm text-muted-foreground">This mentor hasn't published any availability yet.</p>
                ) : (
                  <>
                    {/* Step 1: date */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">1. Choose a date (only the mentor's available days are selectable)</p>
                      <div className="flex justify-center rounded-lg border border-border">
                        <CalendarPicker
                          mode="single"
                          selected={selectedDate}
                          onSelect={(d) => { setSelectedDate(d); setSelectedTime(""); }}
                          disabled={isDateDisabled}
                          initialFocus
                        />
                      </div>
                    </div>

                    {/* Step 2: time */}
                    {selectedDate && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">2. Choose a 1-hour time slot on {formattedDate}</p>
                        {timeSlotsForDate.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No time slots for this day.</p>
                        ) : timeSlotsForDate.every((slot) => isSlotPast(slot.split(" ").slice(1).join(" "))) ? (
                          <p className="text-sm text-muted-foreground">All of today's slots have passed — please pick a future date.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {timeSlotsForDate.map((slot) => {
                              const range = slot.split(" ").slice(1).join(" "); // "09:00-10:00"
                              const isSel = selectedTime === range;
                              const past = isSlotPast(range);
                              return (
                                <button
                                  key={slot}
                                  type="button"
                                  disabled={past}
                                  onClick={() => setSelectedTime(range)}
                                  title={past ? "This time has already passed" : undefined}
                                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border-2 transition-all text-sm font-medium whitespace-nowrap ${
                                    past
                                      ? "border-border text-muted-foreground/50 line-through cursor-not-allowed opacity-50"
                                      : isSel
                                      ? "border-action bg-action/5 text-foreground"
                                      : "border-border text-muted-foreground hover:border-action/40"
                                  }`}
                                >
                                  <Clock className={`h-3.5 w-3.5 shrink-0 ${isSel && !past ? "text-action" : "text-muted-foreground"}`} />
                                  <span className="whitespace-nowrap">{rangeTo12h(range)}</span>
                                  {isSel && !past && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-action" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Session Details */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Session Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="topic">Topic</Label>
                  <Input
                    id="topic"
                    placeholder="e.g., Career guidance, Resume review..."
                    value={sessionTopic}
                    onChange={(e) => setSessionTopic(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Anything specific you'd like to discuss..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment was inline here — now it's in the dialog below */}

            {/* Confirm Session button — prominent, always visible */}
            <Button
              className="w-full gap-2 h-12 text-base"
              variant="action"
              disabled={!canProceedToPayment}
              onClick={() => setShowPackageDialog(true)}
            >
              <CheckCircle2 className="h-5 w-5" />
              {canProceedToPayment ? "Confirm Session" : "Select a slot and enter a topic to continue"}
            </Button>
          </div>

          {/* Right Column - Summary */}
          <div>
            <Card className="border-2 border-action/20 bg-gradient-to-br from-card to-action/5 sticky top-24">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mentor</span>
                    <span className="font-medium">{mentor.name}</span>
                  </div>
                  {selectedDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date</span>
                      <span className="font-medium text-right text-xs">{formattedDate}</span>
                    </div>
                  )}
                  {selectedTime && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Time</span>
                      <span className="font-medium">{rangeTo12h(selectedTime)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-medium">60 min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-medium">Video Call</span>
                  </div>
                </div>

                <div className="border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground text-center">Package &amp; price selected at checkout</p>
                </div>

                {!canProceedToPayment && (
                  <p className="text-xs text-muted-foreground text-center">
                    Fill the form on the left to continue.
                  </p>
                )}
                {canProceedToPayment && (
                  <p className="text-xs text-green-600 text-center font-medium">
                    ✓ Ready — click Confirm Session below the form.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Package Selection Dialog */}
      <Dialog open={showPackageDialog} onOpenChange={setShowPackageDialog}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <CreditCard className="h-5 w-5 text-action" />
              Choose Your Package
            </DialogTitle>
            <DialogDescription>
              Select a package to book your video session with <strong>{mentor.name}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {packages.length === 0 && (
              <p className="col-span-full text-sm text-muted-foreground text-center py-6">
                This mentor hasn't listed any services yet.
              </p>
            )}
            {packages.map((pkg) => {
              const IconComponent = pkg.icon;
              return (
                <div
                  key={pkg.id}
                  className="relative rounded-xl border-2 border-border hover:border-action/30 p-4 flex flex-col gap-3 transition-all hover:shadow-md"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <IconComponent className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm leading-tight">{pkg.name}</p>
                      <p className="text-xs text-muted-foreground">{pkg.description}</p>
                    </div>
                  </div>
                  <div className="mt-auto border-t border-border pt-2 flex items-center justify-between">
                    <span className="text-lg font-bold text-foreground">
                      Rs {pkg.price.toLocaleString()}
                    </span>
                    <Button
                      size="sm"
                      variant="action"
                      disabled={isCreating}
                      onClick={() => handleSelectPackage({ name: pkg.name, price: pkg.price })}
                    >
                      {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Select"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookSession;
