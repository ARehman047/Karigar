import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { MentorCard } from "@/components/mentor/MentorCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, ArrowRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { sessionApi, mentorApi } from "@/lib/services";
import { getSessionTiming } from "@/lib/session";
import { useToast } from "@/hooks/use-toast";
import { Session, Mentor } from "@/types";

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [sessionData, mentorData] = await Promise.all([
          sessionApi.list(),
          mentorApi.list(),
        ]);
        if (!active) return;
        setSessions(sessionData);
        setMentors(mentorData);
      } catch (err) {
        if (!active) return;
        toast({
          title: "Failed to load dashboard",
          description: err instanceof Error ? err.message : "Something went wrong.",
          variant: "destructive",
        });
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [toast]);

  const upcomingSessions = sessions.filter((s) => s.status === "APPROVED" && !getSessionTiming(s).hasEnded).length;
  // Completed once the session has taken place — a review is optional.
  const completedSessions = sessions.filter(
    (s) => s.status === "COMPLETED" || (s.status === "APPROVED" && getSessionTiming(s).hasEnded)
  ).length;
  const recommendedMentorsCount = mentors.length;
  const recommendedMentors = mentors.slice(0, 3);
  const displayName = user?.name
    ? user.name.charAt(0).toUpperCase() + user.name.slice(1)
    : "Student";

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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Welcome Section */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Welcome back, {displayName}!</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Here's your progress overview and next steps in your career journey.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link to="/sessions">
            <StatCard
              title="Upcoming Sessions"
              value={upcomingSessions}
              icon={BookOpen}
              description="Scheduled for this week"
            />
          </Link>
          <Link to="/sessions">
            <StatCard
              title="Completed Sessions"
              value={completedSessions}
              icon={BookOpen}
              description="Total sessions completed"
            />
          </Link>
          <StatCard
            title="Recommended Mentors"
            value={recommendedMentorsCount}
            icon={Users}
            description="Matched to your profile"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link to="/sessions">
                      <BookOpen className="mr-2 h-4 w-4" />
                      My Sessions
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link to="/mentors">
                      <Users className="mr-2 h-4 w-4" />
                      Find Mentors
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Recommended Mentors */}
          <div className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Top Recommended Mentors</h2>
              <p className="text-sm text-muted-foreground">
                Based on your profile and career goals
              </p>
            </div>
            <div className="space-y-4">
              {recommendedMentors.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recommended mentors yet</p>
              ) : (
                recommendedMentors.map((mentor) => (
                  <MentorCard key={mentor.id} mentor={mentor} />
                ))
              )}
            </div>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/mentors">
                View All Mentors <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
