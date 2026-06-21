import { useEffect, useState, useRef } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import { GoogleCalendarConnect } from "@/components/settings/GoogleCalendarConnect";
import { DeleteAccountCard } from "@/components/settings/DeleteAccountCard";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { studentApi } from "@/lib/services";
import { Camera, Save, User, Loader2 } from "lucide-react";

const StudentProfile = () => {
  const { user, profile, updateMe } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profileId = (profile as { _id?: string } | null)?._id;

  const [avatarSrc, setAvatarSrc] = useState<string>(user?.avatar || "");
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    country: "Pakistan",
    city: "",
    educationLevel: "undergraduate",
    institution: "",
    fieldOfStudy: "",
    bio: "",
    careerGoals: "",
    linkedin: "",
    github: "",
    timezone: "Asia/Karachi",
  });

  useEffect(() => {
    if (!profileId) {
      setIsLoading(false);
      return;
    }
    let active = true;
    (async () => {
      try {
        const student = await studentApi.get(profileId);
        if (!active) return;
        setForm((prev) => ({
          ...prev,
          name: student.name || prev.name,
          email: student.email || prev.email,
          phone: student.phone || "",
          country: student.country || "Pakistan",
          city: student.city || "",
          educationLevel: student.educationLevel || prev.educationLevel,
          institution: student.university || "",
          fieldOfStudy: student.field || "",
          bio: student.bio || "",
          careerGoals: student.careerGoals || "",
          linkedin: student.linkedin || "",
          github: student.github || "",
          timezone: student.timezone || "Asia/Karachi",
        }));
      } catch (err) {
        if (active)
          toast({
            title: "Failed to load profile",
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
  }, [profileId, toast]);

  // Keep the displayed photo in sync once the user finishes loading / updates.
  useEffect(() => {
    if (user?.avatar) setAvatarSrc(user.avatar);
  }, [user?.avatar]);

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

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
    if (!profileId) {
      toast({
        title: "Unable to save",
        description: "Your profile could not be found.",
        variant: "destructive",
      });
      return;
    }
    setIsSaving(true);
    try {
      await studentApi.update(profileId, {
        phone: form.phone,
        country: form.country,
        city: form.city,
        educationLevel: form.educationLevel,
        institution: form.institution,
        fieldOfStudy: form.fieldOfStudy,
        bio: form.bio,
        careerGoals: form.careerGoals,
        linkedin: form.linkedin,
        github: form.github,
        timezone: form.timezone,
      });
      await updateMe({ name: form.name, phone: form.phone });
      toast({ title: "Profile Updated", description: "Your profile has been saved." });
    } catch (err) {
      toast({
        title: "Failed to save profile",
        description: err instanceof Error ? err.message : "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "ST";

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
      <main className="container mx-auto px-4 lg:px-8 py-8 max-w-3xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground mt-1">Update your personal information and profile photo.</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Photo card */}
          <Card className="border-border">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" />Profile Photo</CardTitle></CardHeader>
            <CardContent className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-border">
                  {avatarSrc ? <AvatarImage src={avatarSrc} alt="Profile" className="object-cover" /> : null}
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">{initials}</AvatarFallback>
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
                <p className="font-medium text-foreground">{form.name}</p>
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
                <Label htmlFor="dob">Date of Birth</Label>
                <Input id="dob" type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} />
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
                <Input id="city" value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Karachi" />
              </div>
            </CardContent>
          </Card>

          {/* Education */}
          <Card className="border-border">
            <CardHeader><CardTitle className="text-base">Education</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Education Level</Label>
                <Select value={form.educationLevel} onValueChange={(v) => set("educationLevel", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high_school">High School</SelectItem>
                    <SelectItem value="undergraduate">Undergraduate</SelectItem>
                    <SelectItem value="graduate">Graduate</SelectItem>
                    <SelectItem value="postgraduate">Postgraduate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="institution">Institution</Label>
                <Input id="institution" value={form.institution} onChange={(e) => set("institution", e.target.value)} placeholder="FAST-NUCES, LUMS…" />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="field">Field of Study</Label>
                <Input id="field" value={form.fieldOfStudy} onChange={(e) => set("fieldOfStudy", e.target.value)} placeholder="Computer Science" />
              </div>
            </CardContent>
          </Card>

          {/* About */}
          <Card className="border-border">
            <CardHeader><CardTitle className="text-base">About You</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="bio">Short Bio</Label>
                <Textarea id="bio" rows={3} value={form.bio} onChange={(e) => set("bio", e.target.value)} placeholder="Tell mentors a bit about yourself…" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="goals">Career Goals</Label>
                <Textarea id="goals" rows={3} value={form.careerGoals} onChange={(e) => set("careerGoals", e.target.value)} placeholder="What do you want to achieve?" />
              </div>
            </CardContent>
          </Card>

          {/* Social links */}
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
            <Button type="submit" className="gap-2 px-8" disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </Button>
          </div>
        </form>

        {/* Calendar integration (outside the form — has its own actions) */}
        <GoogleCalendarConnect />

        <DeleteAccountCard />
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

export default StudentProfile;
