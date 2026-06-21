import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, ArrowLeft, GraduationCap, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Checkbox } from "@/components/ui/checkbox";
import { UserRole } from "@/types";
import { cn } from "@/lib/utils";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

type LoginStep = "role" | "credentials";

const ROLE_OPTIONS: { value: UserRole; label: string; description: string; icon: React.ElementType; bg: string; iconColor: string }[] = [
  { value: "student", label: "Student", description: "Find mentors and book learning sessions", icon: GraduationCap, bg: "bg-primary/10", iconColor: "text-primary" },
  { value: "mentor", label: "Mentor", description: "Mentor students and manage your sessions", icon: Briefcase, bg: "bg-action/10", iconColor: "text-action" },
];

const Login = () => {
  const [step, setStep] = useState<LoginStep>("role");
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { login, isAuthenticated, user } = useAuth();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  useEffect(() => {
    if (isAuthenticated && user) {
      const dest = from || (user.role === "admin" ? "/admin" : user.role === "mentor" ? "/mentor-dashboard" : "/dashboard");
      navigate(dest, { replace: true });
    }
  }, [isAuthenticated, user, navigate, from]);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setStep("credentials");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    setIsLoading(true);
    const result = await login(email, password, selectedRole);
    setIsLoading(false);
    if (result.success) {
      toast({ title: "Welcome back!", description: "Successfully logged in." });
    } else {
      toast({ title: "Login failed", description: result.message ?? "Invalid credentials.", variant: "destructive" });
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
              <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
              <CardDescription>Choose how you want to sign in</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pb-6">
              {ROLE_OPTIONS.map(({ value, label, description, icon: Icon, bg, iconColor }) => (
                <button key={value} onClick={() => handleRoleSelect(value)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary/40 hover:bg-secondary/50 text-left transition-all duration-200 hover:shadow-md">
                  <div className={cn("p-3 rounded-xl", bg)}>
                    <Icon className={cn("h-6 w-6", iconColor)} />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{label}</p>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                </button>
              ))}
              <GoogleSignInButton />
            </CardContent>
            <CardFooter>
              <p className="text-sm text-center w-full text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/signup" className="text-action hover:underline font-medium">Sign up</Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      <BgBlobs />
      <div className="w-full max-w-md relative z-10">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => setStep("role")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />Back
          </Button>
        </div>
        <Card className="border-border shadow-2xl backdrop-blur-sm bg-card/95 animate-fade-in">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-1">
              <span className="text-xs bg-secondary px-3 py-1 rounded-full text-muted-foreground capitalize font-medium">
                Signing in as {selectedRole}
              </span>
            </div>
            <CardTitle className="text-2xl font-bold text-center">Welcome back</CardTitle>
            <CardDescription className="text-center">Enter your credentials to continue</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link to="/forgot-password" className="text-sm text-action hover:underline">Forgot password?</Link>
                </div>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="Enter your password"
                    value={password} onChange={(e) => setPassword(e.target.value)} required className="pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="remember" checked={rememberMe} onCheckedChange={(v) => setRememberMe(!!v)} />
                <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">Remember me</Label>
              </div>
              <Button type="submit" variant="action" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
            </CardContent>
          </form>
          <CardFooter>
            <p className="text-sm text-center w-full text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup" className="text-action hover:underline font-medium">Sign up</Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Login;
