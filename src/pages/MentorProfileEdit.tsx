import { useState, useRef, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import { AvailabilityEditor } from "@/components/mentor/AvailabilityEditor";
import { CertificateUpload, CertFile } from "@/components/mentor/CertificateUpload";
import { BankAccountsEditor, type BankAccountInput } from "@/components/mentor/BankAccountsEditor";
import { MentorEarningsTable } from "@/components/mentor/MentorEarningsTable";
import { SPECIALITIES } from "@/lib/pricing";
import { GoogleCalendarConnect } from "@/components/settings/GoogleCalendarConnect";
import { DeleteAccountCard } from "@/components/settings/DeleteAccountCard";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { mentorApi } from "@/lib/services";
import { Camera, Save, X, Plus, Loader2 } from "lucide-react";

const LANGUAGES = ["English", "Urdu", "Punjabi", "Sindhi", "Pashto", "Arabic", "French", "German"];
const PK_CITIES = ["Islamabad", "Lahore", "Karachi", "Rawalpindi", "Faisalabad", "Peshawar", "Multan", "Quetta", "Sialkot", "Gujranwala", "Hyderabad", "Abbottabad", "Bahawalpur", "Sargodha", "Sukkur", "Other"];

interface MentorProfileData {
  _id?: string;
  phone?: string;
  gender?: string;
  country?: string;
  city?: string;
  designation?: string;
  company?: string;
  university?: string;
  education?: string;
  yearsOfExperience?: number;
  specialization?: string;
  hourlyRate?: number;
  bio?: string;
  achievements?: string;
  certifications?: string;
  certificateFiles?: CertFile[];
  linkedin?: string;
  github?: string;
  timezone?: string;
  skills?: string[];
  languages?: string[];
  availableDays?: string[];
  availability?: string[];
  bankAccounts?: BankAccountInput[];
  specialities?: string[];
}

const MentorProfileEdit = () => {
  const { user, updateMe, profile, refreshProfile } = useAuth();
  const mentorProfile = profile as MentorProfileData | null;
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [avatarSrc, setAvatarSrc] = useState<string>(user?.avatar || "");
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState("");
  const [saving, setSaving] = useState(false);
  const [availability, setAvailability] = useState<string[]>([]);
  const [certificateFiles, setCertificateFiles] = useState<CertFile[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountInput[]>([]);
  const [specialities, setSpecialities] = useState<string[]>([]);

  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    country: "Pakistan",
    city: "",
    designation: "",
    company: "",
    university: "",
    education: "",
    yearsOfExperience: "",
    specialization: "",
    hourlyRate: "",
    bio: "",
    achievements: "",
    certifications: "",
    linkedin: "",
    github: "",
    timezone: "Asia/Karachi",
  });

  // Keep the displayed photo in sync once the user finishes loading / updates.
  useEffect(() => {
    if (user?.avatar) setAvatarSrc(user.avatar);
  }, [user?.avatar]);

  // Populate the form from the loaded mentor profile.
  useEffect(() => {
    if (!mentorProfile) return;
    setForm((prev) => ({
      ...prev,
      name: user?.name || prev.name,
      email: user?.email || prev.email,
      phone: mentorProfile.phone || "",
      gender: mentorProfile.gender || "",
      country: mentorProfile.country || "Pakistan",
      city: mentorProfile.city || "",
      designation: mentorProfile.designation || "",
      company: mentorProfile.company || "",
      university: mentorProfile.university || "",
      education: mentorProfile.education || "",
      yearsOfExperience: mentorProfile.yearsOfExperience != null ? String(mentorProfile.yearsOfExperience) : "",
      specialization: mentorProfile.specialization || "",
      hourlyRate: mentorProfile.hourlyRate != null ? String(mentorProfile.hourlyRate) : "",
      bio: mentorProfile.bio || "",
      achievements: mentorProfile.achievements || "",
      certifications: mentorProfile.certifications || "",
      linkedin: mentorProfile.linkedin || "",
      github: mentorProfile.github || "",
      timezone: mentorProfile.timezone || "Asia/Karachi",
    }));
    if (mentorProfile.availability?.length) setAvailability(mentorProfile.availability);
    if (mentorProfile.certificateFiles?.length) setCertificateFiles(mentorProfile.certificateFiles);
    if (mentorProfile.languages?.length) setLanguages(mentorProfile.languages);
    if (mentorProfile.skills?.length) setSkills(mentorProfile.skills);
    if (mentorProfile.bankAccounts?.length) setBankAccounts(mentorProfile.bankAccounts);
    if (mentorProfile.specialities?.length) setSpecialities(mentorProfile.specialities);
  }, [mentorProfile, user?.name, user?.email]);

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));


  const toggleLanguage = (lang: string) =>
    setLanguages((prev) => prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]);

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills((prev) => [...prev, trimmed]);
      setSkillInput("");
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setRawImageSrc(ev.target?.result as string);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mentorProfile?._id) {
      toast({ title: "Profile not loaded", description: "Please try again in a moment.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await mentorApi.update(mentorProfile._id, {
        phone: form.phone,
        gender: form.gender,
        country: form.country,
        city: form.city,
        designation: form.designation,
        title: form.designation,
        company: form.company,
        university: form.university,
        education: form.education,
        qualification: form.education,
        yearsOfExperience: Number(form.yearsOfExperience) || 0,
        specialization: form.specialization,
        field: form.specialization,
        // Session rate is a fixed platform amount — not editable by mentors.
        bio: form.bio,
        achievements: form.achievements,
        certifications: form.certifications,
        certificateFiles,
        linkedin: form.linkedin,
        github: form.github,
        timezone: form.timezone,
        skills,
        expertise: skills,
        languages,
        availability,
        availableDays: [...new Set(availability.map((s) => s.split(" ")[0]))],
        availableSlots: availability,
        bankAccounts: bankAccounts.filter((a) => a.accountNumber.trim() || a.bankName.trim()),
        specialities,
      });
      await updateMe({ name: form.name, phone: form.phone });
      await refreshProfile();
      toast({ title: "Profile Updated", description: "Your mentor profile has been saved." });
    } catch (err) {
      toast({ title: "Save failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "MT";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 lg:px-8 py-8 max-w-3xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground mt-1">Keep your profile up to date so students can find and book you.</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Photo */}
          <Card className="border-border">
            <CardHeader><CardTitle className="text-base">Profile Photo</CardTitle></CardHeader>
            <CardContent className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-border">
                  {avatarSrc ? <AvatarImage src={avatarSrc} alt="Profile" className="object-cover" /> : null}
                  <AvatarFallback className="bg-action/10 text-action text-2xl font-bold">{initials}</AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1.5 hover:bg-primary/90 transition-colors"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </div>
              <div>
                <p className="font-medium text-foreground">{form.name || user?.name}</p>
                <p className="text-sm text-muted-foreground">{form.email}</p>
              </div>
            </CardContent>
          </Card>

          {/* Personal info */}
          <Card className="border-border">
            <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Your full name" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={form.email} disabled className="bg-muted/30" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+92 300 0000000" />
              </div>
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="prefer_not">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <Select value={form.city} onValueChange={(v) => set("city", v)}>
                  <SelectTrigger id="city"><SelectValue placeholder="Select your city" /></SelectTrigger>
                  <SelectContent>{PK_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={form.timezone} onValueChange={(v) => set("timezone", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Karachi">Pakistan (PKT)</SelectItem>
                    <SelectItem value="Asia/Dubai">Dubai (GST)</SelectItem>
                    <SelectItem value="Europe/London">London (GMT)</SelectItem>
                    <SelectItem value="America/New_York">New York (EST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Professional */}
          <Card className="border-border">
            <CardHeader><CardTitle className="text-base">Professional Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="designation">Job Title / Designation</Label>
                <Input id="designation" value={form.designation} onChange={(e) => set("designation", e.target.value)} placeholder="Senior Software Engineer" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="company">Company / Organisation</Label>
                <Input id="company" value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="Systems Limited" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="years">Years of Experience</Label>
                <Input id="years" type="number" min={0} value={form.yearsOfExperience} onChange={(e) => set("yearsOfExperience", e.target.value)} placeholder="5" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="specialization">Specialization / Field</Label>
                <Input id="specialization" value={form.specialization} onChange={(e) => set("specialization", e.target.value)} placeholder="Full-Stack Development" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="university">Academic Institution</Label>
                <Input id="university" value={form.university} onChange={(e) => set("university", e.target.value)} placeholder="FAST-NUCES" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="education">Highest Degree</Label>
                <Input id="education" value={form.education} onChange={(e) => set("education", e.target.value)} placeholder="BS Computer Science" />
              </div>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card className="border-border">
            <CardHeader><CardTitle className="text-base">Skills</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="gap-1 pr-1">
                    {skill}
                    <button type="button" onClick={() => setSkills((prev) => prev.filter((s) => s !== skill))} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a skill…"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                  className="max-w-xs"
                />
                <Button type="button" variant="outline" size="sm" onClick={addSkill}>
                  <Plus className="h-4 w-4 mr-1" />Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Availability */}
          <Card className="border-border">
            <CardHeader><CardTitle className="text-base">Availability</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Label>Pick the days and time slots you're available for sessions</Label>
              <AvailabilityEditor value={availability} onChange={setAvailability} />
            </CardContent>
          </Card>

          {/* Languages */}
          <Card className="border-border">
            <CardHeader><CardTitle className="text-base">Languages</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => toggleLanguage(lang)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      languages.includes(lang)
                        ? "bg-action text-action-foreground border-action"
                        : "bg-background text-muted-foreground border-border hover:border-action"
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* About */}
          <Card className="border-border">
            <CardHeader><CardTitle className="text-base">About</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" rows={4} value={form.bio} onChange={(e) => set("bio", e.target.value)} placeholder="Describe your experience and how you can help students…" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="achievements">Achievements</Label>
                <Textarea id="achievements" rows={3} value={form.achievements} onChange={(e) => set("achievements", e.target.value)} placeholder="Notable projects, awards, publications…" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="certifications">Certifications</Label>
                <Textarea id="certifications" rows={2} value={form.certifications} onChange={(e) => set("certifications", e.target.value)} placeholder="AWS Certified, PMP, Google Cloud…" />
              </div>
              <div className="space-y-1.5">
                <Label>Certificate PDFs</Label>
                <p className="text-xs text-muted-foreground">Uploaded documents the admin uses to verify your credentials.</p>
                <CertificateUpload value={certificateFiles} onChange={setCertificateFiles} />
              </div>
            </CardContent>
          </Card>

          {/* Specialities + earnings */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base">Your Specialities & Earnings</CardTitle>
              <p className="text-xs text-muted-foreground">The services you offer (students filter & book by these), and what you earn for each.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {SPECIALITIES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSpecialities((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))}
                    className={`px-3 py-1.5 rounded-lg text-sm border ${specialities.includes(s) ? "bg-action text-action-foreground border-action" : "border-border text-muted-foreground hover:border-action/50"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <MentorEarningsTable />
            </CardContent>
          </Card>

          {/* Payout bank accounts */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base">Payout Bank Accounts</CardTitle>
              <p className="text-xs text-muted-foreground">Where we send your session earnings. Add one or more — kept private (students never see these).</p>
            </CardHeader>
            <CardContent>
              <BankAccountsEditor value={bankAccounts} onChange={setBankAccounts} />
            </CardContent>
          </Card>

          {/* Social */}
          <Card className="border-border">
            <CardHeader><CardTitle className="text-base">Social Links</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="linkedin">LinkedIn URL</Label>
                <Input id="linkedin" value={form.linkedin} onChange={(e) => set("linkedin", e.target.value)} placeholder="https://linkedin.com/in/…" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="github">GitHub URL</Label>
                <Input id="github" value={form.github} onChange={(e) => set("github", e.target.value)} placeholder="https://github.com/…" />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" className="gap-2 px-8" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save Changes
            </Button>
          </div>
        </form>

        {/* Calendar integration (outside the form — has its own actions) */}
        <div className="space-y-6 pb-8">
          <GoogleCalendarConnect />
          <DeleteAccountCard />
        </div>
      </main>

      <ImageCropDialog
        open={cropDialogOpen}
        imageSrc={rawImageSrc}
        onClose={() => setCropDialogOpen(false)}
        onCrop={(cropped) => {
          setAvatarSrc(cropped);
          setCropDialogOpen(false);
          updateMe({ profilePicture: cropped }).catch((err) =>
            toast({ title: "Couldn't save photo", description: (err as Error).message, variant: "destructive" })
          );
        }}
      />
    </div>
  );
};

export default MentorProfileEdit;
