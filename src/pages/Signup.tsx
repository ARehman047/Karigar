import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowLeft, GraduationCap, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { UserRole } from "@/types";
import { cn } from "@/lib/utils";
import { AvailabilityEditor } from "@/components/mentor/AvailabilityEditor";
import { CertificateUpload, CertFile } from "@/components/mentor/CertificateUpload";
import { BankAccountsEditor, emptyBankAccount, type BankAccountInput } from "@/components/mentor/BankAccountsEditor";
import { MentorEarningsTable } from "@/components/mentor/MentorEarningsTable";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SPECIALITIES } from "@/lib/pricing";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { authApi } from "@/lib/services";
import { Mail, ShieldCheck } from "lucide-react";

type SignupStep = "role" | "verify" | "form";

const TIMEZONES = ["Asia/Karachi", "Asia/Dubai", "Asia/Kolkata", "Europe/London", "America/New_York", "America/Los_Angeles"];
const EDUCATION_LEVELS = ["High School", "Intermediate", "Undergraduate", "Postgraduate", "PhD", "Other"];
const FIELDS = ["Computer Science", "Software Engineering", "Business Administration", "Data Science", "Electrical Engineering", "Medicine", "Law", "Graphic Design", "Civil Engineering", "Psychology", "Finance & Accounting", "Media & Communications", "Mechanical Engineering", "Biotechnology", "Education", "Other"];
const COUNTRIES = ["Pakistan", "India", "UAE", "UK", "USA", "Canada", "Saudi Arabia", "Other"];
const PK_CITIES = ["Islamabad", "Lahore", "Karachi", "Rawalpindi", "Faisalabad", "Peshawar", "Multan", "Quetta", "Sialkot", "Gujranwala", "Hyderabad", "Abbottabad", "Bahawalpur", "Sargodha", "Sukkur", "Other"];
const LANGUAGES = ["English", "Urdu", "Punjabi", "Sindhi", "Pashto", "Arabic", "Hindi", "Other"];

const Signup = () => {
  const [step, setStep] = useState<SignupStep>("role");
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountInput[]>([emptyBankAccount()]);
  const [specialities, setSpecialities] = useState<string[]>([]);
  const [showEarnings, setShowEarnings] = useState(false);
  const [earningsSeen, setEarningsSeen] = useState(false);

  // Show the earnings popup once when a mentor reaches the details form.
  useEffect(() => {
    if (step === "form" && selectedRole === "mentor" && !earningsSeen) {
      setShowEarnings(true);
      setEarningsSeen(true);
    }
  }, [step, selectedRole, earningsSeen]);
  const [availability, setAvailability] = useState<string[]>([]);
  const [certificateFiles, setCertificateFiles] = useState<CertFile[]>([]);
  const [preferredFields, setPreferredFields] = useState<string[]>([]);

  // ── Email OTP verification ──
  const [verifyEmail, setVerifyEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [emailToken, setEmailToken] = useState("");

  // Student form
  const [studentForm, setStudentForm] = useState({
    name: "", email: "", password: "", phoneNumber: "", dateOfBirth: "", gender: "",
    country: "Pakistan", city: "", educationLevel: "", institution: "", fieldOfStudy: "",
    careerGoals: "", bio: "", linkedin: "", github: "", timezone: "Asia/Karachi",
    preferredMentorType: "both",
  });

  // Mentor form
  const [mentorForm, setMentorForm] = useState({
    name: "", email: "", password: "", phoneNumber: "", dateOfBirth: "", gender: "",
    country: "Pakistan", city: "", education: "", university: "", designation: "",
    company: "", yearsOfExperience: "", specialization: "", bio: "", achievements: "",
    certifications: "", linkedin: "", github: "", timezone: "Asia/Karachi", hourlyRate: "4000",
    type: "industry", field: "",
  });

  const navigate = useNavigate();
  const { toast } = useToast();
  const { register, isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(user.role === "mentor" ? "/mentor-dashboard" : "/dashboard", { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const toggleLang = (lang: string) => setSelectedLanguages((l) => l.includes(lang) ? l.filter((x) => x !== lang) : [...l, lang]);
  const toggleField = (f: string) => setPreferredFields((p) => p.includes(f) ? p.filter((x) => x !== f) : [...p, f]);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSendOtp = async () => {
    if (!isValidEmail(verifyEmail)) {
      toast({ title: "Invalid email", description: "Enter a valid email address.", variant: "destructive" });
      return;
    }
    setOtpSending(true);
    try {
      const { message, devCode } = await authApi.sendOtp(verifyEmail);
      setOtpSent(true);
      setDevCode(devCode ?? null);
      setOtp("");
      toast({ title: "Code sent", description: devCode ? `Dev mode — your code is ${devCode}` : message });
    } catch (e) {
      toast({ title: "Couldn't send code", description: (e as Error).message, variant: "destructive" });
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;
    setOtpVerifying(true);
    try {
      const token = await authApi.verifyOtp(verifyEmail, otp);
      setEmailToken(token);
      setVerifiedEmail(verifyEmail);
      setStudentForm((f) => ({ ...f, email: verifyEmail }));
      setMentorForm((f) => ({ ...f, email: verifyEmail }));
      toast({ title: "Email verified ✓", description: "Continue to complete your profile." });
      setStep("form");
    } catch (e) {
      toast({ title: "Verification failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeToTerms) { toast({ title: "Terms required", variant: "destructive" }); return; }
    setIsLoading(true);
    const result = await register(
      {
        ...studentForm,
        email: verifiedEmail,
        emailVerificationToken: emailToken,
        interests: preferredFields,
        preferredFields,
        preferredMentorCategories: preferredFields,
      },
      "student"
    );
    setIsLoading(false);
    if (result.success) {
      // Students are activated immediately and logged straight in.
      toast({ title: "Welcome to Karigar!", description: result.message || "Your account is ready." });
      navigate("/dashboard", { replace: true });
    } else {
      toast({ title: "Registration failed", description: result.message, variant: "destructive" });
    }
  };

  const handleMentorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeToTerms) { toast({ title: "Terms required", variant: "destructive" }); return; }
    if (!mentorForm.field) { toast({ title: "Field required", description: "Please select your primary field.", variant: "destructive" }); return; }
    setIsLoading(true);
    const result = await register(
      {
        ...mentorForm,
        email: verifiedEmail,
        emailVerificationToken: emailToken,
        title: mentorForm.designation,
        qualification: mentorForm.education,
        expertise: [mentorForm.specialization].filter(Boolean),
        languages: selectedLanguages,
        availability,
        availableDays: [...new Set(availability.map((s) => s.split(" ")[0]))],
        availableSlots: availability,
        certificateFiles,
        subjects: [],
        skills: [mentorForm.specialization].filter(Boolean),
        bankAccounts: bankAccounts.filter((a) => a.accountNumber.trim() || a.bankName.trim()),
        specialities,
      },
      "mentor"
    );
    setIsLoading(false);
    if (result.success) {
      toast({ title: "Application submitted!", description: result.message || "Your mentor profile is pending admin approval." });
      navigate("/login", { replace: true });
    } else {
      toast({ title: "Registration failed", description: result.message, variant: "destructive" });
    }
  };

  const BgBlobs = () => (
    <div className="absolute inset-0 bg-gradient-to-br from-background via-secondary/30 to-background pointer-events-none">
      <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" />
      <div className="absolute top-0 -right-4 w-72 h-72 bg-action/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-accent/30 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000" />
    </div>
  );

  if (step === "role") {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
        <BgBlobs />
        <div className="w-full max-w-md relative z-10">
          <div className="mb-6">
            <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground">
              <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" />Home</Link>
            </Button>
          </div>
          <Card className="border-border shadow-2xl backdrop-blur-sm bg-card/95 animate-fade-in">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
              <CardDescription>Choose how you want to join Karigar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pb-6">
              {[
                { value: "student" as UserRole, label: "Join as Student", description: "Find mentors, book sessions, advance your career", icon: GraduationCap, bg: "bg-primary/10", iconColor: "text-primary" },
                { value: "mentor" as UserRole, label: "Join as Mentor", description: "Share your expertise, earn income, guide students", icon: Briefcase, bg: "bg-action/10", iconColor: "text-action" },
              ].map(({ value, label, description, icon: Icon, bg, iconColor }) => (
                <button key={value} onClick={() => { setSelectedRole(value); setStep("verify"); }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary/40 hover:bg-secondary/50 text-left transition-all duration-200 hover:shadow-md">
                  <div className={cn("p-3 rounded-xl", bg)}><Icon className={cn("h-6 w-6", iconColor)} /></div>
                  <div>
                    <p className="font-semibold text-foreground">{label}</p>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                </button>
              ))}
            </CardContent>
            <CardFooter>
              <p className="text-sm text-center w-full text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-action hover:underline font-medium">Sign in</Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // ─── Phone Verification Step ──────────────────────────────────────────────────
  if (step === "verify") {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
        <BgBlobs />
        <div className="w-full max-w-md relative z-10">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => setStep("role")} className="text-muted-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" />Back
            </Button>
          </div>
          <Card className="border-border shadow-2xl bg-card/95 animate-fade-in">
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-1">
                <div className="p-3 rounded-2xl bg-primary/10"><ShieldCheck className="h-6 w-6 text-primary" /></div>
              </div>
              <CardTitle className="text-2xl font-bold">Verify your email</CardTitle>
              <CardDescription>We'll send a 6-digit code to your email to confirm it before you continue.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="v-email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="v-email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-9"
                    value={verifyEmail}
                    onChange={(e) => setVerifyEmail(e.target.value)}
                    disabled={otpSent}
                  />
                </div>
                <p className="text-xs text-muted-foreground">We'll send your verification code here.</p>
              </div>

              {!otpSent ? (
                <Button variant="action" className="w-full" onClick={handleSendOtp} disabled={otpSending}>
                  {otpSending ? "Sending..." : "Send Verification Code"}
                </Button>
              ) : (
                <div className="space-y-4">
                  {devCode && (
                    <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground text-center">
                      <strong>Dev mode:</strong> email isn't configured, so your code is <strong>{devCode}</strong>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Enter the 6-digit code</Label>
                    <div className="flex justify-center">
                      <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                  </div>
                  <Button variant="action" className="w-full" onClick={handleVerifyOtp} disabled={otpVerifying || otp.length !== 6}>
                    {otpVerifying ? "Verifying..." : "Verify & Continue"}
                  </Button>
                  <div className="flex items-center justify-between text-sm">
                    <button type="button" onClick={() => { setOtpSent(false); setOtp(""); setDevCode(null); }} className="text-muted-foreground hover:text-foreground">
                      Change email
                    </button>
                    <button type="button" onClick={handleSendOtp} disabled={otpSending} className="text-action hover:underline">
                      Resend code
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <p className="text-sm text-center w-full text-muted-foreground">
                Already have an account? <Link to="/login" className="text-action hover:underline font-medium">Sign in</Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // ─── Student Registration Form ────────────────────────────────────────────────
  if (selectedRole === "student") {
    return (
      <div className="min-h-screen relative overflow-hidden py-8 px-4">
        <BgBlobs />
        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => setStep("role")} className="text-muted-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" />Back
            </Button>
          </div>
          <Card className="border-border shadow-2xl bg-card/95">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Student Registration</CardTitle>
              <CardDescription>Create your student profile to start finding mentors</CardDescription>
            </CardHeader>
            <form onSubmit={handleStudentSubmit}>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="s-name">Full Name *</Label>
                    <Input id="s-name" placeholder="Your full name" value={studentForm.name} required onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="s-email">Email <span className="text-green-600 text-xs">✓ Verified</span></Label>
                    <Input id="s-email" type="email" value={studentForm.email} disabled className="bg-muted/30" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="s-pwd">Password *</Label>
                    <div className="relative">
                      <Input id="s-pwd" type={showPassword ? "text" : "password"} placeholder="Min 6 characters" value={studentForm.password} required onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })} className="pr-10" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="s-phone">Phone Number</Label>
                    <Input id="s-phone" placeholder="+92 300 0000000" value={studentForm.phoneNumber} onChange={(e) => setStudentForm({ ...studentForm, phoneNumber: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="s-dob">Date of Birth</Label>
                    <Input id="s-dob" type="date" value={studentForm.dateOfBirth} onChange={(e) => setStudentForm({ ...studentForm, dateOfBirth: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select value={studentForm.gender} onValueChange={(v) => setStudentForm({ ...studentForm, gender: v })}>
                      <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                      <SelectContent>
                        {["Male", "Female", "Non-binary", "Prefer not to say"].map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Select value={studentForm.country} onValueChange={(v) => setStudentForm({ ...studentForm, country: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="s-city">City</Label>
                    <Input id="s-city" placeholder="Your city" value={studentForm.city} onChange={(e) => setStudentForm({ ...studentForm, city: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Education Level *</Label>
                    <Select value={studentForm.educationLevel} onValueChange={(v) => setStudentForm({ ...studentForm, educationLevel: v })}>
                      <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                      <SelectContent>{EDUCATION_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="s-inst">Institution *</Label>
                    <Input id="s-inst" placeholder="University / School" value={studentForm.institution} required onChange={(e) => setStudentForm({ ...studentForm, institution: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Field of Study *</Label>
                    <Select value={studentForm.fieldOfStudy} onValueChange={(v) => setStudentForm({ ...studentForm, fieldOfStudy: v })}>
                      <SelectTrigger><SelectValue placeholder="Select field" /></SelectTrigger>
                      <SelectContent>{FIELDS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select value={studentForm.timezone} onValueChange={(v) => setStudentForm({ ...studentForm, timezone: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TIMEZONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Mentor matching preferences */}
                <div className="space-y-4 p-4 rounded-xl border border-primary/20 bg-primary/5">
                  <div className="space-y-1">
                    <Label className="text-base font-semibold">What kind of mentors are you looking for? *</Label>
                    <p className="text-xs text-muted-foreground">We'll tailor the mentors you see to your preferences.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Preferred Mentor Type *</Label>
                    <Select value={studentForm.preferredMentorType} onValueChange={(v) => setStudentForm({ ...studentForm, preferredMentorType: v })}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="academic">Academic — professors, researchers, educators</SelectItem>
                        <SelectItem value="industry">Industry — working professionals & entrepreneurs</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Preferred Fields {preferredFields.length > 0 && <span className="text-muted-foreground">({preferredFields.length} selected)</span>}</Label>
                    <div className="flex flex-wrap gap-2">
                      {FIELDS.filter((f) => f !== "Other").map((f) => (
                        <button key={f} type="button" onClick={() => toggleField(f)}
                          className={cn("px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors", preferredFields.includes(f) ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50")}>
                          {f}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">Leave empty to see mentors from all fields.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="s-goals">Career Goals</Label>
                  <Textarea id="s-goals" placeholder="Describe your career goals..." value={studentForm.careerGoals} onChange={(e) => setStudentForm({ ...studentForm, careerGoals: e.target.value })} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s-bio">Bio</Label>
                  <Textarea id="s-bio" placeholder="Tell mentors about yourself..." value={studentForm.bio} onChange={(e) => setStudentForm({ ...studentForm, bio: e.target.value })} rows={3} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="s-li">LinkedIn (optional)</Label>
                    <Input id="s-li" placeholder="linkedin.com/in/..." value={studentForm.linkedin} onChange={(e) => setStudentForm({ ...studentForm, linkedin: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="s-gh">GitHub (optional)</Label>
                    <Input id="s-gh" placeholder="github.com/..." value={studentForm.github} onChange={(e) => setStudentForm({ ...studentForm, github: e.target.value })} />
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <Checkbox id="terms" checked={agreeToTerms} onCheckedChange={(v) => setAgreeToTerms(!!v)} />
                  <label htmlFor="terms" className="text-sm text-muted-foreground">
                    I agree to the <Link to="/terms" className="text-action hover:underline">Terms of Service</Link> and <Link to="/privacy" className="text-action hover:underline">Privacy Policy</Link>
                  </label>
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-3">
                <Button type="submit" variant="action" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creating account..." : "Create Student Account"}
                </Button>
                <p className="text-sm text-center text-muted-foreground">
                  Already have an account? <Link to="/login" className="text-action hover:underline">Sign in</Link>
                </p>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  // ─── Mentor Registration Form ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen relative overflow-hidden py-8 px-4">
      <BgBlobs />
      <div className="relative z-10 max-w-2xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => setStep("role")} className="text-muted-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />Back
          </Button>
        </div>
        <Card className="border-border shadow-2xl bg-card/95">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Mentor Registration</CardTitle>
            <CardDescription>Create your mentor profile. Your account will be reviewed before activation.</CardDescription>
          </CardHeader>
          <form onSubmit={handleMentorSubmit}>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="m-name">Full Name *</Label>
                  <Input id="m-name" placeholder="Your full name" value={mentorForm.name} required onChange={(e) => setMentorForm({ ...mentorForm, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="m-email">Email <span className="text-green-600 text-xs">✓ Verified</span></Label>
                  <Input id="m-email" type="email" value={mentorForm.email} disabled className="bg-muted/30" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="m-pwd">Password *</Label>
                  <div className="relative">
                    <Input id="m-pwd" type={showPassword ? "text" : "password"} placeholder="Min 6 characters" value={mentorForm.password} required onChange={(e) => setMentorForm({ ...mentorForm, password: e.target.value })} className="pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="m-phone">Phone Number</Label>
                  <Input id="m-phone" placeholder="+92 300 0000000" value={mentorForm.phoneNumber} onChange={(e) => setMentorForm({ ...mentorForm, phoneNumber: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="m-dob">Date of Birth</Label>
                  <Input id="m-dob" type="date" value={mentorForm.dateOfBirth} onChange={(e) => setMentorForm({ ...mentorForm, dateOfBirth: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select value={mentorForm.gender} onValueChange={(v) => setMentorForm({ ...mentorForm, gender: v })}>
                    <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>{["Male", "Female", "Non-binary", "Prefer not to say"].map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Select value={mentorForm.country} onValueChange={(v) => setMentorForm({ ...mentorForm, country: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="m-city">City</Label>
                  <Select value={mentorForm.city} onValueChange={(v) => setMentorForm({ ...mentorForm, city: v })}>
                    <SelectTrigger id="m-city"><SelectValue placeholder="Select your city" /></SelectTrigger>
                    <SelectContent>{PK_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="m-desig">Designation *</Label>
                  <Input id="m-desig" placeholder="e.g. Senior Engineer" value={mentorForm.designation} required onChange={(e) => setMentorForm({ ...mentorForm, designation: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="m-company">Company / Institution</Label>
                  <Input id="m-company" placeholder="Where you work" value={mentorForm.company} onChange={(e) => setMentorForm({ ...mentorForm, company: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="m-university">University (Education)</Label>
                  <Input id="m-university" placeholder="Your university" value={mentorForm.university} onChange={(e) => setMentorForm({ ...mentorForm, university: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="m-edu">Highest Qualification *</Label>
                  <Input id="m-edu" placeholder="e.g. MS Computer Science" value={mentorForm.education} required onChange={(e) => setMentorForm({ ...mentorForm, education: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="m-yoe">Years of Experience</Label>
                  <Input id="m-yoe" type="number" min="0" max="50" placeholder="e.g. 5" value={mentorForm.yearsOfExperience} onChange={(e) => setMentorForm({ ...mentorForm, yearsOfExperience: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="m-spec">Specialization *</Label>
                  <Input id="m-spec" placeholder="e.g. Machine Learning" value={mentorForm.specialization} required onChange={(e) => setMentorForm({ ...mentorForm, specialization: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Mentor Type *</Label>
                  <Select value={mentorForm.type} onValueChange={(v) => setMentorForm({ ...mentorForm, type: v })}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="academic">Academic (professor / researcher / educator)</SelectItem>
                      <SelectItem value="industry">Industry (professional / entrepreneur)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Primary Field *</Label>
                  <Select value={mentorForm.field} onValueChange={(v) => setMentorForm({ ...mentorForm, field: v })}>
                    <SelectTrigger><SelectValue placeholder="Select field" /></SelectTrigger>
                    <SelectContent>{FIELDS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select value={mentorForm.timezone} onValueChange={(v) => setMentorForm({ ...mentorForm, timezone: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIMEZONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Availability — pick the days and time slots you're available</Label>
                <AvailabilityEditor value={availability} onChange={setAvailability} />
              </div>
              <div className="space-y-2">
                <Label>Your Specialities (services you offer)</Label>
                <p className="text-xs text-muted-foreground">Pick the services you'll provide. Students filter and book by these. You can select more than one.</p>
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
              </div>
              <div className="space-y-2">
                <Label>Bank Account(s) for Payouts</Label>
                <p className="text-xs text-muted-foreground">Where we'll send your session earnings. Add one or more — kept private (students never see these).</p>
                <BankAccountsEditor value={bankAccounts} onChange={setBankAccounts} />
              </div>
              <button
                type="button"
                onClick={() => setShowEarnings(true)}
                className="text-sm font-medium text-action underline underline-offset-2"
              >
                💰 See what you'll earn per session
              </button>

              <Dialog open={showEarnings} onOpenChange={setShowEarnings}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>What you'll earn</DialogTitle>
                    <DialogDescription>This is what Karigar pays you for each completed service.</DialogDescription>
                  </DialogHeader>
                  <MentorEarningsTable />
                  <DialogFooter>
                    <Button variant="action" onClick={() => setShowEarnings(false)}>Got it</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <div className="space-y-2">
                <Label>Languages</Label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((lang) => (
                    <button key={lang} type="button" onClick={() => toggleLang(lang)}
                      className={cn("px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors", selectedLanguages.includes(lang) ? "bg-action text-action-foreground border-action" : "border-border text-muted-foreground hover:border-action/50")}>
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-bio">Bio *</Label>
                <Textarea id="m-bio" placeholder="Describe your background, expertise, and what you can offer students..." value={mentorForm.bio} required onChange={(e) => setMentorForm({ ...mentorForm, bio: e.target.value })} rows={4} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-achiev">Achievements (optional)</Label>
                <Textarea id="m-achiev" placeholder="Notable achievements, publications, awards..." value={mentorForm.achievements} onChange={(e) => setMentorForm({ ...mentorForm, achievements: e.target.value })} rows={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-cert">Certifications (optional)</Label>
                <Textarea id="m-cert" placeholder="List your relevant certifications..." value={mentorForm.certifications} onChange={(e) => setMentorForm({ ...mentorForm, certifications: e.target.value })} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Upload Certificate PDFs (for verification)</Label>
                <p className="text-xs text-muted-foreground">Upload your degree/certification documents. Our admin reviews these to verify your credentials before approving your account.</p>
                <CertificateUpload value={certificateFiles} onChange={setCertificateFiles} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="m-li">LinkedIn (optional)</Label>
                  <Input id="m-li" placeholder="linkedin.com/in/..." value={mentorForm.linkedin} onChange={(e) => setMentorForm({ ...mentorForm, linkedin: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="m-gh">GitHub (optional)</Label>
                  <Input id="m-gh" placeholder="github.com/..." value={mentorForm.github} onChange={(e) => setMentorForm({ ...mentorForm, github: e.target.value })} />
                </div>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                Your mentor profile will be reviewed by admin before activation. You'll receive an email once approved.
              </div>
              <div className="flex items-start space-x-2">
                <Checkbox id="m-terms" checked={agreeToTerms} onCheckedChange={(v) => setAgreeToTerms(!!v)} />
                <label htmlFor="m-terms" className="text-sm text-muted-foreground">
                  I agree to the <Link to="/terms" className="text-action hover:underline">Terms of Service</Link> and <Link to="/privacy" className="text-action hover:underline">Privacy Policy</Link>
                </label>
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-3">
              <Button type="submit" variant="action" className="w-full" disabled={isLoading}>
                {isLoading ? "Submitting..." : "Submit Mentor Application"}
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                Already have an account? <Link to="/login" className="text-action hover:underline">Sign in</Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
