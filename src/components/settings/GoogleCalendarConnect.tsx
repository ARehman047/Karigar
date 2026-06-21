import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarCheck, CalendarPlus, Loader2, CheckCircle2 } from "lucide-react";
import { authApi } from "@/lib/services";
import { useToast } from "@/hooks/use-toast";

/**
 * Lets a student/mentor connect their Google Calendar so confirmed sessions are
 * added automatically (with reminders handled by Google). Self-contained:
 * fetches its own connection status and reacts to the ?calendar= redirect param.
 */
export const GoogleCalendarConnect = () => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [connected, setConnected] = useState(false);
  const [email, setEmail] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      const { user } = await authApi.me();
      setConnected(!!user.calendarConnected);
      setEmail(user.calendarEmail);
    } catch {
      /* leave as-is */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  // Handle the redirect back from Google's consent screen.
  useEffect(() => {
    const result = searchParams.get("calendar");
    if (!result) return;
    if (result === "connected") {
      toast({ title: "Google Calendar connected", description: "Your confirmed sessions will be added automatically." });
      refresh();
    } else if (result === "error") {
      toast({
        title: "Couldn't connect Google Calendar",
        description: "Please try again and allow calendar access.",
        variant: "destructive",
      });
    }
    // Clean the param from the URL.
    searchParams.delete("calendar");
    setSearchParams(searchParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = async () => {
    setBusy(true);
    try {
      const url = await authApi.getCalendarConnectUrl();
      window.location.href = url; // full redirect to Google consent
    } catch (err) {
      toast({
        title: "Couldn't start Google Calendar connection",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    setBusy(true);
    try {
      await authApi.disconnectCalendar();
      setConnected(false);
      setEmail(undefined);
      toast({ title: "Disconnected", description: "Google Calendar has been disconnected." });
    } catch (err) {
      toast({
        title: "Couldn't disconnect",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
            <CalendarCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-lg">Google Calendar</CardTitle>
            <CardDescription>
              Connect your calendar so confirmed sessions are added automatically — Google then sends you
              reminders so you never miss a session.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking connection…
          </div>
        ) : connected ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
              <span className="text-foreground">
                Connected{email ? <span className="text-muted-foreground"> · {email}</span> : null}
              </span>
            </div>
            <Button variant="outline" onClick={handleDisconnect} disabled={busy} className="w-full sm:w-auto">
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Disconnect
            </Button>
          </div>
        ) : (
          <Button variant="action" onClick={handleConnect} disabled={busy} className="w-full sm:w-auto gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
            Connect Google Calendar
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
