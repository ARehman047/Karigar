import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { notificationApi } from "@/lib/services";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Notification } from "@/types";
import { Bell, BookOpen, DollarSign, CalendarCheck, X, CheckCircle2, Clock, MessageCircle, ShieldCheck, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

const TYPE_ICONS: Record<string, React.ElementType> = {
  booking_created: BookOpen,
  payment_approved: DollarSign,
  session_approved: CalendarCheck,
  session_rejected: X,
  session_reminder: Clock,
  session_cancelled: X,
  new_message: MessageCircle,
  mentor_approved: ShieldCheck,
};

const TYPE_COLORS: Record<string, string> = {
  booking_created: "bg-primary/10 text-primary",
  payment_approved: "bg-green-100 text-green-700",
  session_approved: "bg-green-100 text-green-700",
  session_rejected: "bg-red-100 text-red-700",
  session_reminder: "bg-yellow-100 text-yellow-700",
  session_cancelled: "bg-red-100 text-red-700",
  new_message: "bg-blue-100 text-blue-700",
  mentor_approved: "bg-action/10 text-action",
};

const NotificationsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    notificationApi
      .list()
      .then((data) => active && setNotifications(data))
      .catch((err) => toast({ title: "Couldn't load notifications", description: err.message, variant: "destructive" }))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [toast]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Where each notification is acted on, based on the current user's role.
  const destFor = (n: Notification): string => {
    if (user?.role === "admin") return "/admin";
    if (user?.role === "mentor") return n.type === "mentor_approved" ? "/mentor-dashboard" : "/appointments";
    return "/sessions"; // student
  };

  const removeLocal = (id: string) => setNotifications((prev) => prev.filter((n) => n.id !== id));

  // Clicking a notification takes you to where it's handled, and removes it.
  const handleOpen = (n: Notification) => {
    removeLocal(n.id);
    notificationApi.remove(n.id).catch(() => {});
    navigate(destFor(n));
  };

  const handleRemove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeLocal(id);
    notificationApi.remove(id).catch(() => {});
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await notificationApi.markAllRead();
    } catch {
      /* optimistic — ignore */
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 lg:px-8 py-8 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
            {unreadCount > 0 && <Badge className="bg-red-500 text-white">{unreadCount} new</Badge>}
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : notifications.length === 0 ? (
          <Card className="border-border">
            <CardContent className="py-16 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No notifications yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => {
              const Icon = TYPE_ICONS[notif.type] || Bell;
              const colorClass = TYPE_COLORS[notif.type] || "bg-muted text-muted-foreground";
              return (
                <div
                  key={notif.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleOpen(notif)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleOpen(notif); }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md hover:border-primary/40 ${
                    notif.isRead ? "border-border bg-card" : "border-primary/30 bg-primary/5"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl shrink-0 ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-foreground text-sm">{notif.title}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">{notif.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-red-500"
                          onClick={(e) => handleRemove(e, notif.id)}
                          aria-label="Remove notification"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-action mt-1">Click to open →</p>
                    </div>
                    {!notif.isRead && <span className="h-2 w-2 bg-primary rounded-full shrink-0 mt-1" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default NotificationsPage;
