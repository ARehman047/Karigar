import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, GraduationCap, Filter, Mail, Loader2 } from "lucide-react";
import { CITIES } from "@/lib/constants";
import { adminApi } from "@/lib/services";
import { useToast } from "@/hooks/use-toast";
import { Student } from "@/types";
import { useState, useMemo, useEffect } from "react";

const Students = () => {
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterField, setFilterField] = useState<string>("all");
  const [filterCity, setFilterCity] = useState<string>("all");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await adminApi.students();
        setStudents(data);
      } catch (err) {
        toast({
          title: "Failed to load students",
          description: err instanceof Error ? err.message : "Please try again later.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [toast]);

  const filteredStudents = useMemo(() => {
    let result = students;

    if (filterField !== "all") {
      result = result.filter((s) => s.field === filterField);
    }

    if (filterCity !== "all") {
      result = result.filter((s) => s.city === filterCity);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.field.toLowerCase().includes(query) ||
          s.university.toLowerCase().includes(query) ||
          s.interests.some((i) => i.toLowerCase().includes(query)) ||
          s.city.toLowerCase().includes(query)
      );
    }

    return result;
  }, [students, searchQuery, filterField, filterCity]);

  const activeFields = [...new Set(students.map((s) => s.field).filter(Boolean))];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Browse Students</h1>
          <p className="text-muted-foreground">
            Find students looking for mentorship in your field. Connect and guide the next generation.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, field, university, or interest..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
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

            {(filterField !== "all" || filterCity !== "all" || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterField("all");
                  setFilterCity("all");
                  setSearchQuery("");
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Results */}
        <div>
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
          <>
          <h2 className="text-xl font-semibold text-foreground mb-6">
            {filteredStudents.length} Student{filteredStudents.length !== 1 ? "s" : ""} Found
          </h2>

          {filteredStudents.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStudents.map((student) => {
                const initials = student.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("");

                return (
                  <Card key={student.id} className="hover:shadow-lg transition-all duration-200 border-border">
                    <CardHeader className="pb-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-14 w-14 border-2 border-action">
                          <AvatarFallback className="bg-action text-action-foreground text-lg">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg text-foreground truncate">
                            {student.name}
                          </h3>
                          <p className="text-sm text-muted-foreground truncate">{student.degree}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs gap-1">
                              <GraduationCap className="h-3 w-3" />
                              Year {student.year}
                            </Badge>
                            {student.gpa && (
                              <span className="text-xs text-muted-foreground">
                                GPA: {student.gpa.toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pb-4 space-y-3">
                      <p className="text-sm text-muted-foreground line-clamp-2">{student.bio}</p>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>{student.city}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {student.field}
                        </Badge>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        <GraduationCap className="h-3.5 w-3.5 inline mr-1" />
                        {student.university}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {student.interests.map((interest, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>

                    <CardFooter className="flex-col gap-2">
                      <div className="flex items-center gap-4 w-full text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          <span>{student.email}</span>
                        </div>
                      </div>
                      
                      <Button variant="action" className="w-full mt-2">
                        Connect with Student
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 space-y-4">
              <p className="text-xl font-semibold text-foreground">No students found</p>
              <p className="text-muted-foreground">
                Try adjusting your filters or search query.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setFilterField("all");
                  setFilterCity("all");
                  setSearchQuery("");
                }}
              >
                Reset Filters
              </Button>
            </div>
          )}
          </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Students;
