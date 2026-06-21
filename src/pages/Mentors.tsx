import { Header } from "@/components/layout/Header";
import { MentorCard } from "@/components/mentor/MentorCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, BookOpen, Briefcase, MapPin, Filter, Loader2, Award, Sparkles } from "lucide-react";
import { SPECIALITIES } from "@/lib/pricing";
import { CITIES } from "@/lib/constants";
import { mentorApi } from "@/lib/services";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Mentor } from "@/types";
import { useState, useMemo, useEffect } from "react";

const Mentors = () => {
  const { profile, isStudent } = useAuth();
  const { toast } = useToast();

  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "academic" | "industry">("all");
  const [filterField, setFilterField] = useState<string>("all");
  const [filterCity, setFilterCity] = useState<string>("all");
  const [filterBadge, setFilterBadge] = useState<"all" | "gold" | "silver" | "none">("all");
  const [filterSpeciality, setFilterSpeciality] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"rating" | "sessions" | "price">("rating");

  // Student's saved preferred mentor type — used as a soft default only.
  const prefType = (profile?.preferredMentorType as string) || "both";
  const [prefApplied, setPrefApplied] = useState(false);

  // Seed the type filter from the student's preference once (they can change it freely).
  useEffect(() => {
    if (isStudent && !prefApplied && (prefType === "academic" || prefType === "industry")) {
      setFilterType(prefType);
      setPrefApplied(true);
    }
  }, [isStudent, prefType, prefApplied]);

  // A preference-based default is active (and reversible) when the type filter
  // was auto-set from the student's preference and they haven't widened it.
  const prefDefaultActive = isStudent && prefApplied && filterType !== "all" && filterType === prefType;

  useEffect(() => {
    let active = true;
    setLoading(true);
    mentorApi
      .list()
      .then((data) => {
        if (active) setMentors(data);
      })
      .catch((err) => toast({ title: "Couldn't load mentors", description: err.message, variant: "destructive" }))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [toast]);

  const filteredMentors = useMemo(() => {
    let result = mentors;

    if (filterType !== "all") result = result.filter((m) => m.type === filterType);
    if (filterField !== "all") result = result.filter((m) => m.field === filterField);
    if (filterCity !== "all") result = result.filter((m) => m.city === filterCity);
    if (filterBadge !== "all") {
      result = result.filter((m) =>
        filterBadge === "none" ? !m.badge || m.badge === "none" : m.badge === filterBadge
      );
    }
    if (filterSpeciality !== "all") result = result.filter((m) => m.specialities?.includes(filterSpeciality));

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.expertise.some((e) => e.toLowerCase().includes(query)) ||
          m.field.toLowerCase().includes(query) ||
          m.title.toLowerCase().includes(query) ||
          m.city.toLowerCase().includes(query)
      );
    }

    // Badge takes priority: Gold mentors first, then Silver, then the rest —
    // with the chosen sort applied within each badge tier.
    const badgeRank = (m: Mentor) => (m.badge === "gold" ? 2 : m.badge === "silver" ? 1 : 0);
    return [...result].sort((a, b) => {
      const byBadge = badgeRank(b) - badgeRank(a);
      if (byBadge !== 0) return byBadge;
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "sessions") return b.sessionsCount - a.sessionsCount;
      return a.hourlyRate - b.hourlyRate;
    });
  }, [mentors, searchQuery, filterType, filterField, filterCity, filterBadge, filterSpeciality, sortBy]);

  const activeFields = [...new Set(mentors.map((m) => m.field))];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Header Section */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Find Your Perfect Mentor</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Connect with expert mentors who will guide you from theory to practice. Filter by field, city, or expertise.
          </p>
        </div>

        {prefDefaultActive && (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium capitalize">{filterType}</span> mentors based on your preference.
            </p>
            <Button variant="ghost" size="sm" onClick={() => setFilterType("all")}>
              Show all mentors
            </Button>
          </div>
        )}

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, expertise, field, or city..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex flex-wrap gap-2">
              <Button variant={filterType === "all" ? "default" : "outline"} onClick={() => setFilterType("all")} size="sm" className="flex-1 sm:flex-none">
                All Mentors
              </Button>
              <Button variant={filterType === "academic" ? "default" : "outline"} onClick={() => setFilterType("academic")} size="sm" className="flex-1 sm:flex-none gap-1">
                <BookOpen className="h-4 w-4" />
                Academic
              </Button>
              <Button variant={filterType === "industry" ? "default" : "outline"} onClick={() => setFilterType("industry")} size="sm" className="flex-1 sm:flex-none gap-1">
                <Briefcase className="h-4 w-4" />
                Industry
              </Button>
            </div>

            <Select value={filterField} onValueChange={setFilterField}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Fields" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Fields</SelectItem>
                {activeFields.map((field) => (
                  <SelectItem key={field} value={field}>
                    {field}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterCity} onValueChange={setFilterCity}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <MapPin className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {CITIES.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterBadge} onValueChange={(v) => setFilterBadge(v as typeof filterBadge)}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <Award className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Badge" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Badges</SelectItem>
                <SelectItem value="gold">Gold Badge</SelectItem>
                <SelectItem value="silver">Silver Badge</SelectItem>
                <SelectItem value="none">No Badge</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterSpeciality} onValueChange={setFilterSpeciality}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Sparkles className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Speciality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Specialities</SelectItem>
                {SPECIALITIES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as "rating" | "sessions" | "price")}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="sessions">Most Sessions</SelectItem>
                <SelectItem value="price">Lowest Price</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">
                {filteredMentors.length} Mentor{filteredMentors.length !== 1 ? "s" : ""} Found
              </h2>
              {(filterField !== "all" || filterCity !== "all" || filterType !== "all" || filterBadge !== "all" || filterSpeciality !== "all" || searchQuery) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterField("all");
                    setFilterCity("all");
                    setFilterType("all");
                    setFilterBadge("all");
                    setFilterSpeciality("all");
                    setSearchQuery("");
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>

            {filteredMentors.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMentors.map((mentor) => (
                  <MentorCard key={mentor.id} mentor={mentor} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 space-y-4">
                <p className="text-xl font-semibold text-foreground">No mentors found</p>
                <p className="text-muted-foreground">Try adjusting your filters or search query to find available mentors.</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilterField("all");
                    setFilterCity("all");
                    setFilterType("all");
                    setFilterBadge("all");
                    setFilterSpeciality("all");
                    setSearchQuery("");
                  }}
                >
                  Reset Filters
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Mentors;
