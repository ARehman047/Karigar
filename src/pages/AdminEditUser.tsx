import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { adminApi } from "@/lib/services";
import { openDataUrl } from "@/lib/file";
import { FIELDS, CITIES, COUNTRIES, EDUCATION_LEVELS, TIMEZONES, LANGUAGES } from "@/lib/constants";
import { AvailabilityEditor } from "@/components/mentor/AvailabilityEditor";
import { ArrowLeft, Save, Loader2, FileText, Eye } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Profile = Record<string, any>;

const AdminEditUser = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<"student" | "mentor" | "admin" | "">("");
  const [account, setAccount] = useState({ name: "", email: "", phone: "", status: "active" });
  const [profile, setProfile] = useState<Profile>({});
  const [certs, setCerts] = useState<{ name: string; data: string }[]>([]);

  const setP = (k: string, v: unknown) => setProfile((prev) => ({ ...prev, [k]: v }));
  const arr = (k: string): string[] => (Array.isArray(profile[k]) ? profile[k] : []);
  const toggle = (k: string, val: string) => {
    const cur = arr(k);
    setP(k, cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val]);
  };
  const csv = (k: string) => (arr(k) || []).join(", ");
  const setCsv = (k: string, v: string) => setP(k, v.split(",").map((s) => s.trim()).filter(Boolean));

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setLoading(true);
    adminApi
      .getUserFull(userId)
      .then(({ user, profile: p }) => {
        if (!active) return;
        setRole(user.role);
        setAccount({ name: user.name || "", email: user.email || "", phone: user.phone || "", status: user.status || "active" });
        const prof = (p || {}) as Profile;
        const { certificateFiles, ...rest } = prof;
        setCerts(Array.isArray(certificateFiles) ? certificateFiles : []);
        setProfile(rest);
      })
      .catch((err) => toast({ title: "Couldn't load user", description: err.message, variant: "destructive" }))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [userId, toast]);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      // For mentors keep expertise aligned with skills.
      const profilePayload: Profile = { ...profile };
      if (role === "mentor" && Array.isArray(profilePayload.skills)) profilePayload.expertise = profilePayload.skills;
      await adminApi.updateUserFull(userId, { user: account, profile: profilePayload });
      toast({ title: "Saved", description: `${account.name}'s profile has been updated.` });
      navigate("/admin");
    } catch (err) {
      toast({ title: "Save failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 lg:px-8 py-8 max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild className="text-muted-foreground"><Link to="/admin"><ArrowLeft className="mr-2 h-4 w-4" />Back to Admin</Link></Button>
          <Badge variant="outline" className="capitalize">{role}</Badge>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Edit {role === "mentor" ? "Mentor" : role === "student" ? "Student" : "User"}</h1>
          <p className="text-muted-foreground mt-1">As admin you can edit every field of this account.</p>
        </div>

        {/* Account */}
        <Card className="border-border">
          <CardHeader><CardTitle className="text-base">Account</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Full Name</Label><Input value={account.name} onChange={(e) => setAccount({ ...account, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Phone</Label><Input value={account.phone} onChange={(e) => setAccount({ ...account, phone: e.target.value })} /></div>
            <div className="space-y-1.5">
              <Label>Account Status</Label>
              <Select value={account.status} onValueChange={(v) => setAccount({ ...account, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {role === "admin" && (
          <Card className="border-border"><CardContent className="py-8 text-center text-muted-foreground">Admin accounts have no extended profile.</CardContent></Card>
        )}

        {/* Student profile */}
        {role === "student" && (
          <>
            <Card className="border-border">
              <CardHeader><CardTitle className="text-base">Personal</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Gender</Label><Input value={profile.gender || ""} onChange={(e) => setP("gender", e.target.value)} /></div>
                <div className="space-y-1.5"><Label>City</Label>
                  <Select value={profile.city || ""} onValueChange={(v) => setP("city", v)}>
                    <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                    <SelectContent>{CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Country</Label>
                  <Select value={profile.country || "Pakistan"} onValueChange={(v) => setP("country", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Timezone</Label>
                  <Select value={profile.timezone || "Asia/Karachi"} onValueChange={(v) => setP("timezone", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIMEZONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader><CardTitle className="text-base">Education & Goals</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Education Level</Label>
                  <Select value={profile.educationLevel || ""} onValueChange={(v) => setP("educationLevel", v)}>
                    <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                    <SelectContent>{EDUCATION_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Institution</Label><Input value={profile.institution || ""} onChange={(e) => setP("institution", e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Field of Study</Label>
                  <Select value={profile.fieldOfStudy || ""} onValueChange={(v) => setP("fieldOfStudy", v)}>
                    <SelectTrigger><SelectValue placeholder="Select field" /></SelectTrigger>
                    <SelectContent>{FIELDS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Preferred Mentor Type</Label>
                  <Select value={profile.preferredMentorType || "both"} onValueChange={(v) => setP("preferredMentorType", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="academic">Academic</SelectItem>
                      <SelectItem value="industry">Industry</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 md:col-span-2"><Label>Career Goals</Label><Textarea rows={2} value={profile.careerGoals || ""} onChange={(e) => setP("careerGoals", e.target.value)} /></div>
                <div className="space-y-1.5 md:col-span-2"><Label>Bio</Label><Textarea rows={3} value={profile.bio || ""} onChange={(e) => setP("bio", e.target.value)} /></div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Preferred Fields</Label>
                  <div className="flex flex-wrap gap-2">
                    {FIELDS.map((f) => (
                      <button key={f} type="button" onClick={() => toggle("preferredFields", f)}
                        className={`px-3 py-1.5 rounded-lg text-sm border ${arr("preferredFields").includes(f) ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>{f}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5 md:col-span-2"><Label>Interests (comma-separated)</Label><Input value={csv("interests")} onChange={(e) => setCsv("interests", e.target.value)} /></div>
                <div className="space-y-1.5"><Label>LinkedIn</Label><Input value={profile.linkedin || ""} onChange={(e) => setP("linkedin", e.target.value)} /></div>
                <div className="space-y-1.5"><Label>GitHub</Label><Input value={profile.github || ""} onChange={(e) => setP("github", e.target.value)} /></div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Mentor profile */}
        {role === "mentor" && (
          <>
            <Card className="border-border">
              <CardHeader><CardTitle className="text-base">Professional</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Contact Phone <span className="text-xs text-muted-foreground">(hidden from students)</span></Label><Input value={profile.phone || ""} onChange={(e) => setP("phone", e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Mentor Type</Label>
                  <Select value={profile.type || "industry"} onValueChange={(v) => setP("type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="academic">Academic</SelectItem>
                      <SelectItem value="industry">Industry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Field</Label>
                  <Select value={profile.field || ""} onValueChange={(v) => setP("field", v)}>
                    <SelectTrigger><SelectValue placeholder="Select field" /></SelectTrigger>
                    <SelectContent>{FIELDS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Title / Designation</Label><Input value={profile.designation || profile.title || ""} onChange={(e) => { setP("designation", e.target.value); setP("title", e.target.value); }} /></div>
                <div className="space-y-1.5"><Label>Specialization</Label><Input value={profile.specialization || ""} onChange={(e) => setP("specialization", e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Company</Label><Input value={profile.company || ""} onChange={(e) => setP("company", e.target.value)} /></div>
                <div className="space-y-1.5"><Label>University</Label><Input value={profile.university || ""} onChange={(e) => setP("university", e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Highest Qualification</Label><Input value={profile.education || profile.qualification || ""} onChange={(e) => { setP("education", e.target.value); setP("qualification", e.target.value); }} /></div>
                <div className="space-y-1.5"><Label>Years of Experience</Label><Input type="number" value={profile.yearsOfExperience ?? ""} onChange={(e) => setP("yearsOfExperience", Number(e.target.value) || 0)} /></div>
                <div className="space-y-1.5"><Label>Hourly Rate (PKR)</Label><Input type="number" value={profile.hourlyRate ?? ""} onChange={(e) => setP("hourlyRate", Number(e.target.value) || 0)} /></div>
                <div className="space-y-1.5"><Label>City</Label>
                  <Select value={profile.city || ""} onValueChange={(v) => setP("city", v)}>
                    <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                    <SelectContent>{CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Timezone</Label>
                  <Select value={profile.timezone || "Asia/Karachi"} onValueChange={(v) => setP("timezone", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIMEZONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader><CardTitle className="text-base">About</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5"><Label>Bio</Label><Textarea rows={4} value={profile.bio || ""} onChange={(e) => setP("bio", e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Achievements</Label><Textarea rows={2} value={profile.achievements || ""} onChange={(e) => setP("achievements", e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Certifications (text)</Label><Textarea rows={2} value={profile.certifications || ""} onChange={(e) => setP("certifications", e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Skills / Expertise (comma-separated)</Label><Input value={csv("skills")} onChange={(e) => setCsv("skills", e.target.value)} /></div>
                <div className="space-y-1.5">
                  <Label>Languages</Label>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES.map((l) => (
                      <button key={l} type="button" onClick={() => toggle("languages", l)}
                        className={`px-3 py-1.5 rounded-lg text-sm border ${arr("languages").includes(l) ? "bg-action text-action-foreground border-action" : "border-border text-muted-foreground hover:border-action/50"}`}>{l}</button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader><CardTitle className="text-base">Availability (1-hour slots)</CardTitle></CardHeader>
              <CardContent>
                <AvailabilityEditor value={arr("availability")} onChange={(v) => { setP("availability", v); setP("availableDays", [...new Set(v.map((s) => s.split(" ")[0]))]); setP("availableSlots", v); }} />
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader><CardTitle className="text-base">Certificate PDFs</CardTitle></CardHeader>
              <CardContent>
                {certs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No certificate files uploaded.</p>
                ) : (
                  <div className="space-y-2">
                    {certs.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg border border-border p-2">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-sm truncate flex-1">{c.name}</span>
                        <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => openDataUrl(c.data)}><Eye className="h-3.5 w-3.5" />View PDF</Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        <div className="flex justify-end gap-3 pb-8">
          <Button variant="outline" asChild><Link to="/admin">Cancel</Link></Button>
          <Button className="gap-2 px-8" disabled={saving} onClick={handleSave}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save Changes
          </Button>
        </div>
      </main>
    </div>
  );
};

export default AdminEditUser;
