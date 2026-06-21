import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, BookOpen, Briefcase, MapPin, Clock, ArrowLeft, Calendar, GraduationCap, Loader2, MessageSquare } from "lucide-react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { mentorApi, type MentorReview } from "@/lib/services";
import { BadgeChip } from "@/components/mentor/BadgeChip";
import { useToast } from "@/hooks/use-toast";
import type { Mentor } from "@/types";

const MentorProfile = () => {
  const { mentorId } = useParams<{ mentorId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [reviews, setReviews] = useState<MentorReview[]>([]);
  const [loading, setLoading] = useState(true);

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
    // Reviews load independently (non-blocking).
    mentorApi.getReviews(mentorId).then(setReviews).catch(() => setReviews([]));
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
          <p className="text-muted-foreground">The mentor you are looking for does not exist.</p>
          <Button asChild>
            <Link to="/mentors">Browse Mentors</Link>
          </Button>
        </div>
      </div>
    );
  }

  const TypeIcon = mentor.type === "academic" ? BookOpen : Briefcase;
  const initials = mentor.name
    .split(" ")
    .map((n) => n[0])
    .join("");

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 lg:px-8 py-8 space-y-8">
        {/* Profile Header */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="border-border">
              <CardContent className="p-8">
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  <Avatar className="h-24 w-24 border-4 border-primary">
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-4">
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-3xl font-bold text-foreground">{mentor.name}</h1>
                        <BadgeChip badge={mentor.badge} />
                      </div>
                      <p className="text-lg text-muted-foreground">{mentor.title}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant="secondary" className="gap-1">
                        <TypeIcon className="h-3 w-3" />
                        {mentor.type === "academic" ? "Academic Expert" : "Industry Expert"}
                      </Badge>
                      <Badge variant="outline">{mentor.field}</Badge>
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="h-4 w-4 fill-warning text-warning" />
                        <span className="font-semibold">{mentor.rating.toFixed(1)}</span>
                        <span className="text-muted-foreground">
                          ({mentor.sessionsCount} sessions)
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {mentor.city}
                      </div>
                      {mentor.university && (
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-4 w-4" />
                          {mentor.university}
                        </div>
                      )}
                      {mentor.company && (
                        <div className="flex items-center gap-1">
                          <Briefcase className="h-4 w-4" />
                          {mentor.company}
                        </div>
                      )}
                    </div>

                    <p className="text-foreground leading-relaxed">{mentor.bio}</p>

                    {mentor.qualification && (
                      <div className="flex items-start gap-2 pt-1">
                        <GraduationCap className="h-4 w-4 text-action mt-0.5 shrink-0" />
                        <p className="text-sm text-muted-foreground">{mentor.qualification}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Expertise */}
            <Card className="border-border mt-6">
              <CardHeader>
                <CardTitle>Areas of Expertise</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {mentor.expertise.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="text-sm py-1 px-3">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Availability */}
            <Card className="border-border mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-action" />
                  Availability
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-3">
                  {mentor.availability.map((slot, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                    >
                      <Calendar className="h-4 w-4 text-action" />
                      <span className="text-sm text-foreground">{slot}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Student Reviews */}
            <Card className="border-border mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-action" />
                  Student Reviews
                  {reviews.length > 0 && (
                    <span className="text-sm font-normal text-muted-foreground">({reviews.length})</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reviews.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No reviews yet. Be the first to book a session and review this mentor.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((r) => (
                      <div key={r.id} className="border-b border-border last:border-0 pb-4 last:pb-0">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="h-8 w-8 border border-border">
                              {r.studentAvatar ? (
                                <AvatarImage src={r.studentAvatar} alt={r.studentName} className="object-cover" />
                              ) : null}
                              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                                {r.studentName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-foreground truncate">{r.studentName}</span>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Star
                                key={n}
                                className={`h-3.5 w-3.5 ${n <= r.rating ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
                              />
                            ))}
                          </div>
                        </div>
                        {r.comment && (
                          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{r.comment}</p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground/70">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Booking Sidebar */}
          <div>
            <Card className="border-2 border-action/20 bg-gradient-to-br from-card to-action/5 sticky top-24">
              <CardContent className="p-6 space-y-6">
                <div className="text-center space-y-1">
                  <p className="text-base font-semibold text-foreground">Book a Session</p>
                  <p className="text-sm text-muted-foreground">
                    Choose a package at checkout — the price depends on the package you select.
                  </p>
                </div>

                <Button variant="action" size="lg" className="w-full text-base" asChild>
                  <Link to={`/book/${mentor.id}`}>Book a Session</Link>
                </Button>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Session Duration</span>
                    <span className="font-medium text-foreground">60 minutes</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Response Time</span>
                    <span className="font-medium text-foreground">Within 24 hours</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Sessions Completed</span>
                    <span className="font-medium text-foreground">{mentor.sessionsCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MentorProfile;
