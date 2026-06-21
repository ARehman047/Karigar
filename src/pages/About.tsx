import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 lg:px-8 py-8 space-y-16 max-w-4xl">
        {/* Mission */}
        <section className="space-y-4">
          <h1 className="text-4xl font-bold text-foreground">About Karigar</h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Karigar is a pioneering startup aiming to transform Pakistan's career guidance
            landscape through a human-centered platform that connects academia and industry.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Unlike global platforms, Karigar is built for Pakistan's specific needs — providing
            accessible, dual expert mentorship and structured career development tools for
            students and professionals.
          </p>
        </section>

        {/* What We Do */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">What We Do</h2>
          <p className="text-muted-foreground leading-relaxed">
            Karigar centralizes personalized career guidance services, integrating one-on-one
            mentorship, assessments, webinars, networking, and expert-led sessions. Our dual
            expert mentorship system matches users with both academic and industry mentors
            based on their field and goals — bridging the gap between theory and practice.
          </p>
        </section>

        {/* Contact */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-foreground">Contact Us</h2>

          <Card className="border-border">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Mahad Imran</h3>
              <p className="text-sm text-muted-foreground">Founder, Karigar</p>

              <div className="space-y-3 pt-2">
                <a
                  href="mailto:mahadimran11@icloud.com"
                  className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="h-4 w-4 text-action" />
                  mahadimran11@icloud.com
                </a>
                
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 text-action" />
                  Pakistan
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* CTA */}
        <section className="text-center space-y-4 pb-8">
          <p className="text-muted-foreground">
            Ready to start your career journey with expert guidance?
          </p>
          <Button variant="action" size="lg" asChild>
            <Link to="/signup">Get Started</Link>
          </Button>
        </section>
      </main>

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

export default About;
