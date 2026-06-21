import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/layout/Header";
import { Users, Target, TrendingUp, Award, CheckCircle2, ArrowRight } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      const dest = user?.role === "mentor" ? "/mentor-dashboard" : user?.role === "admin" ? "/admin" : "/dashboard";
      navigate(dest);
    } else {
      navigate("/signup");
    }
  };

  const handleFindMentors = () => {
    if (isAuthenticated) {
      navigate("/mentors");
    } else {
      navigate("/signup");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-action/5 to-background">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-action/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-accent/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>

        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              <span className="text-foreground">Navigate Your Career with</span>
              <br />
              <span className="bg-gradient-to-r from-primary via-action to-primary bg-clip-text text-transparent animate-gradient">
                Expert Guidance
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Connect with dual mentors—academic and industry experts—to bridge theory and practice in your career journey.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button variant="action" size="lg" className="text-base px-8" onClick={handleGetStarted}>
                Get Started Free
              </Button>
              <Button variant="outline" size="lg" className="text-base px-8" onClick={handleFindMentors}>
                Find Your Mentors
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Why Choose Karigar?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A comprehensive platform designed to accelerate your career growth with structured, expert-led guidance.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="border-border hover:shadow-lg transition-shadow duration-200">
              <CardContent className="pt-8 pb-6 text-center space-y-4">
                <div className="inline-flex p-4 bg-primary/10 rounded-2xl">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg text-foreground">Dual Expert Matching</h3>
                <p className="text-sm text-muted-foreground">
                  Connect with both academic and industry mentors for comprehensive guidance.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border hover:shadow-lg transition-shadow duration-200">
              <CardContent className="pt-8 pb-6 text-center space-y-4">
                <div className="inline-flex p-4 bg-action/10 rounded-2xl">
                  <Target className="h-8 w-8 text-action" />
                </div>
                <h3 className="font-semibold text-lg text-foreground">Personalized Assessments</h3>
                <p className="text-sm text-muted-foreground">
                  Data-driven insights to identify your strengths and growth opportunities.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border hover:shadow-lg transition-shadow duration-200">
              <CardContent className="pt-8 pb-6 text-center space-y-4">
                <div className="inline-flex p-4 bg-primary/10 rounded-2xl">
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg text-foreground">Career Roadmaps</h3>
                <p className="text-sm text-muted-foreground">
                  Structured pathways from education to your dream career position.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border hover:shadow-lg transition-shadow duration-200">
              <CardContent className="pt-8 pb-6 text-center space-y-4">
                <div className="inline-flex p-4 bg-action/10 rounded-2xl">
                  <Award className="h-8 w-8 text-action" />
                </div>
                <h3 className="font-semibold text-lg text-foreground">Verified Experts</h3>
                <p className="text-sm text-muted-foreground">
                  All mentors are thoroughly vetted professionals and academics.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta" className="py-20 bg-gradient-to-br from-primary/10 via-background to-primary/5 border-t border-primary/20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-primary">
              Ready to Transform Your Career?
            </h2>
            <p className="text-lg text-muted-foreground">
              Join thousands of students and professionals who are already building their future with expert guidance.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Button asChild size="lg" className="text-base px-8">
                <Link to="/signup">
                  Start Your Journey <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-card border-t border-border">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>&copy; 2025 Karigar. Empowering careers through expert mentorship.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
