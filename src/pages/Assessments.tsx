import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, CheckCircle2, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const Assessments = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 lg:px-8 py-8 space-y-8">
        {/* Header Section */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Career Assessments</h1>
          <p className="text-muted-foreground">
            Track your skills, identify strengths, and discover areas for growth
          </p>
        </div>

        {/* Coming soon */}
        <Card className="border-2 border-action/20 bg-gradient-to-br from-card to-action/5">
          <CardContent className="py-16 text-center space-y-5 max-w-xl mx-auto">
            <div className="inline-flex p-4 bg-action/10 rounded-2xl">
              <Sparkles className="h-9 w-9 text-action" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Assessments are coming soon</h2>
              <p className="text-muted-foreground">
                We're building personalized skill and career assessments to give you data-driven
                insights into your strengths and growth opportunities. In the meantime, the fastest
                way to level up is to connect with an expert mentor.
              </p>
            </div>
            <Button variant="action" asChild>
              <Link to="/mentors">
                Find a Mentor <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* What's coming */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">What you'll be able to assess</h2>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-border">
              <CardContent className="pt-6 text-center space-y-4">
                <div className="inline-flex p-4 bg-action/10 rounded-2xl">
                  <Target className="h-8 w-8 text-action" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground mb-2">Technical Skills</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Evaluate your technical proficiency and expertise
                  </p>
                  <Badge variant="outline" className="bg-action/10 text-action border-action/20">
                    Coming soon
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="pt-6 text-center space-y-4">
                <div className="inline-flex p-4 bg-primary/10 rounded-2xl">
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground mb-2">Soft Skills</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Assess communication, leadership, and teamwork
                  </p>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    Coming soon
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="pt-6 text-center space-y-4">
                <div className="inline-flex p-4 bg-success/10 rounded-2xl">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground mb-2">Career Readiness</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Check your preparedness for the job market
                  </p>
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                    Coming soon
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Assessments;
