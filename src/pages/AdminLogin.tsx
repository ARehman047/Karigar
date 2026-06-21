import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowLeft, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, isAuthenticated, user } = useAuth();

  // Already-authenticated users go to their own area.
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(user.role === "admin" ? "/admin" : user.role === "mentor" ? "/mentor-dashboard" : "/dashboard", { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await login(email, password, "admin");
    setIsLoading(false);
    if (result.success) {
      toast({ title: "Welcome back, Admin", description: "Successfully logged in." });
    } else {
      toast({ title: "Login failed", description: result.message ?? "Invalid admin credentials.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 bg-gradient-to-br from-background via-secondary/30 to-background">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/20 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob" />
        <div className="absolute -bottom-8 right-10 w-72 h-72 bg-muted-foreground/10 rounded-full mix-blend-multiply filter blur-xl opacity-60 animate-blob animation-delay-4000" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="mb-6">
          <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground">
            <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" />Home</Link>
          </Button>
        </div>

        <Card className="border-border shadow-2xl backdrop-blur-sm bg-card/95 animate-fade-in">
          <CardHeader className="space-y-2 text-center">
            <div className="flex justify-center">
              <div className="p-3 rounded-2xl bg-muted">
                <ShieldCheck className="h-7 w-7 text-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Admin Portal</CardTitle>
            <CardDescription>Restricted access — platform administrators only</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="admin@karigar.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="Enter your password"
                    value={password} onChange={(e) => setPassword(e.target.value)} required className="pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign in to Admin Portal"}
              </Button>
              <p className="text-xs text-center text-muted-foreground pt-2">
                Not an admin?{" "}
                <Link to="/login" className="text-action hover:underline">Student / Mentor sign in</Link>
              </p>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
