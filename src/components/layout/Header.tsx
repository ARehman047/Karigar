import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { GraduationCap, Menu, LogOut, Bell } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { notificationApi } from "@/lib/services";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onMenuClick?: () => void;
  showMenu?: boolean;
}

export const Header = ({ onMenuClick, showMenu = false }: HeaderProps) => {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const location = useLocation();
  const isLandingPage = location.pathname === "/";

  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    setMobileOpen(false);
    logout();
    toast({ title: "Signed out", description: "You have been successfully signed out." });
    navigate("/");
  };

  const capitalizedName = user?.name
    ? user.name.split(" ")[0].charAt(0).toUpperCase() + user.name.split(" ")[0].slice(1)
    : "";

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }
    let active = true;
    notificationApi
      .list()
      .then((notifs) => active && setUnreadCount(notifs.filter((n) => !n.isRead).length))
      .catch(() => active && setUnreadCount(0));
    return () => {
      active = false;
    };
  }, [isAuthenticated, location.pathname]);

  const navLinkClass = (path: string) =>
    `text-sm font-medium transition-colors ${
      location.pathname === path ? "text-action font-semibold" : "text-muted-foreground hover:text-foreground"
    }`;

  // Clicking the avatar/name goes to the user's profile (admins have no profile → dashboard).
  const profilePath =
    user?.role === "mentor" ? "/mentor-profile-edit" : user?.role === "student" ? "/student-profile" : "/admin";

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) element.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Role-aware links reused by the mobile sidebar.
  const mobileLinks =
    user?.role === "student"
      ? [
          { to: "/dashboard", label: "Dashboard" },
          { to: "/mentors", label: "Find Mentors" },
          { to: "/sessions", label: "Sessions" },
          { to: "/student-profile", label: "Profile" },
        ]
      : user?.role === "mentor"
      ? [
          { to: "/mentor-dashboard", label: "Dashboard" },
          { to: "/sessions", label: "Sessions" },
          { to: "/appointments", label: "Session Requests" },
          { to: "/mentor-profile-edit", label: "Profile" },
        ]
      : user?.role === "admin"
      ? [{ to: "/admin", label: "Dashboard" }]
      : [];

  const mobileLinkClass = (path: string) =>
    cn(
      "rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
      location.pathname === path
        ? "bg-accent text-action font-semibold"
        : "text-muted-foreground hover:bg-accent hover:text-foreground"
    );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-2">
          {showMenu && (
            <Button variant="ghost" size="icon" onClick={onMenuClick} className="lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <Link to="/" className="flex items-center gap-2 font-semibold text-lg">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="text-primary">Karigar</span>
            {user?.role === "admin" && (
              <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">Admin</span>
            )}
          </Link>
        </div>

        {/* Landing page nav (unauthenticated) */}
        {isLandingPage && !isAuthenticated && (
          <nav className="hidden md:flex items-center gap-6">
            <button onClick={() => scrollToSection("features")} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Why Karigar
            </button>
            <button onClick={() => scrollToSection("cta")} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Join Us
            </button>
            <Link to="/about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              About
            </Link>
          </nav>
        )}

        {/* Student nav */}
        {isAuthenticated && user?.role === "student" && (
          <nav className="hidden md:flex items-center gap-5">
            <Link to="/dashboard" className={navLinkClass("/dashboard")}>Dashboard</Link>
            <Link to="/mentors" className={navLinkClass("/mentors")}>Find Mentors</Link>
            <Link to="/sessions" className={navLinkClass("/sessions")}>Sessions</Link>
            <Link to="/student-profile" className={navLinkClass("/student-profile")}>Profile</Link>
          </nav>
        )}

        {/* Mentor nav */}
        {isAuthenticated && user?.role === "mentor" && (
          <nav className="hidden md:flex items-center gap-5">
            <Link to="/mentor-dashboard" className={navLinkClass("/mentor-dashboard")}>Dashboard</Link>
            <Link to="/sessions" className={navLinkClass("/sessions")}>Sessions</Link>
            <Link to="/appointments" className={navLinkClass("/appointments")}>Session Requests</Link>
            <Link to="/mentor-profile-edit" className={navLinkClass("/mentor-profile-edit")}>Profile</Link>
          </nav>
        )}

        {/* Right side actions */}
        <div className="flex items-center gap-1">
          {isAuthenticated ? (
            <>
              {/* Avatar + Name → profile (desktop) */}
              <Link to={profilePath} className="hidden md:flex items-center gap-1.5 hover:opacity-80 transition-opacity px-2 py-1 rounded-md hover:bg-accent">
                <Avatar className="h-7 w-7 border border-border">
                  {user?.avatar ? <AvatarImage src={user.avatar} alt={user.name} className="object-cover" /> : null}
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {capitalizedName[0] ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-semibold text-foreground">{capitalizedName}</span>
              </Link>

              {/* Bell — tight to name */}
              <Link to="/notifications" className="relative p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>

              {/* Sign Out (desktop) */}
              <Button variant="ghost" size="sm" onClick={handleLogout} className="hidden md:inline-flex gap-1.5 px-2">
                <LogOut className="h-4 w-4" />Sign Out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" className="hidden md:inline-flex" asChild>
                <Link to="/login">Sign In</Link>
              </Button>
              <Button variant="action" asChild>
                <Link to="/signup">Get Started</Link>
              </Button>
            </>
          )}

          {/* Mobile hamburger → slide-in sidebar */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden h-9 w-9" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] p-0 flex flex-col">
              <SheetHeader className="border-b p-4 text-left">
                <SheetTitle className="flex items-center gap-2 text-lg">
                  <GraduationCap className="h-6 w-6 text-primary" />
                  <span className="text-primary">Karigar</span>
                  {user?.role === "admin" && (
                    <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">Admin</span>
                  )}
                </SheetTitle>
              </SheetHeader>

              {/* Profile summary */}
              {isAuthenticated && (
                <SheetClose asChild>
                  <Link to={profilePath} className="flex items-center gap-3 border-b px-4 py-3 hover:bg-accent transition-colors">
                    <Avatar className="h-10 w-10 border border-border">
                      {user?.avatar ? <AvatarImage src={user.avatar} alt={user.name} className="object-cover" /> : null}
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                        {capitalizedName[0] ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{capitalizedName || "User"}</p>
                      <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
                    </div>
                  </Link>
                </SheetClose>
              )}

              {/* Links */}
              <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
                {isAuthenticated &&
                  mobileLinks.map((link) => (
                    <SheetClose asChild key={link.to}>
                      <Link to={link.to} className={mobileLinkClass(link.to)}>
                        {link.label}
                      </Link>
                    </SheetClose>
                  ))}

                {isAuthenticated && (
                  <SheetClose asChild>
                    <Link to="/notifications" className={mobileLinkClass("/notifications")}>
                      <span className="flex w-full items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Bell className="h-4 w-4" /> Notifications
                        </span>
                        {unreadCount > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs text-white">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </span>
                        )}
                      </span>
                    </Link>
                  </SheetClose>
                )}

                {/* Landing links (unauthenticated) */}
                {!isAuthenticated && isLandingPage && (
                  <>
                    <button
                      onClick={() => {
                        setMobileOpen(false);
                        setTimeout(() => scrollToSection("features"), 150);
                      }}
                      className={cn(mobileLinkClass("__none__"), "text-left")}
                    >
                      Why Karigar
                    </button>
                    <button
                      onClick={() => {
                        setMobileOpen(false);
                        setTimeout(() => scrollToSection("cta"), 150);
                      }}
                      className={cn(mobileLinkClass("__none__"), "text-left")}
                    >
                      Join Us
                    </button>
                    <SheetClose asChild>
                      <Link to="/about" className={mobileLinkClass("/about")}>About</Link>
                    </SheetClose>
                  </>
                )}
              </nav>

              {/* Footer actions */}
              <div className="border-t p-4">
                {isAuthenticated ? (
                  <Button variant="outline" className="w-full gap-2" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" /> Sign Out
                  </Button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <SheetClose asChild>
                      <Button variant="outline" className="w-full" asChild>
                        <Link to="/login">Sign In</Link>
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button variant="action" className="w-full" asChild>
                        <Link to="/signup">Get Started</Link>
                      </Button>
                    </SheetClose>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};
