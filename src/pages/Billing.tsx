import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Check,
  CreditCard,
  Sparkles,
  Users,
  FileText,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";
import { PaymentForm } from "@/components/payment/PaymentForm";

interface SelectedPackage {
  id: number;
  name: string;
  price: number;
}

const Billing = () => {
  const [selectedPackage, setSelectedPackage] = useState<SelectedPackage | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSelectPackage = (pkg: SelectedPackage) => {
    setSelectedPackage(pkg);
    setShowPaymentForm(true);
  };

  const packages = [
    {
      id: 1,
      name: "Basic Career Consultation",
      price: 6000,
      icon: MessageSquare,
      description: "Get started with professional career guidance",
      features: [
        "One-on-one consultation session",
        "Career assessment review",
        "Personalized career roadmap",
        "Email support for 7 days",
      ],
      popular: false,
    },
    {
      id: 2,
      name: "Academic Mentorship",
      price: 12000,
      icon: Sparkles,
      description: "Complete academic guidance package",
      features: [
        "3 mentoring sessions per month",
        "Academic progress tracking",
        "Study plan development",
        "Research guidance",
        "Priority email support",
      ],
      popular: true,
    },
    {
      id: 3,
      name: "Entrepreneurial Coaching",
      price: 16000,
      icon: Sparkles,
      description: "Launch and grow your business",
      features: [
        "3 coaching sessions per month",
        "Business plan development",
        "Market research assistance",
        "Pitch preparation",
        "Investor connect opportunities",
      ],
      popular: true,
    },
    {
      id: 4,
      name: "CV/Resume Building",
      price: 12000,
      icon: FileText,
      description: "Professional resume crafting service",
      features: [
        "ATS-optimized resume",
        "Cover letter template",
        "LinkedIn profile optimization",
        "2 rounds of revisions",
        "Industry-specific formatting",
      ],
      popular: false,
    },
    {
      id: 5,
      name: "Parental Guidance Sessions",
      price: 6000,
      icon: Users,
      description: "Guide your child's career journey",
      features: [
        "Family consultation session",
        "Career path exploration",
        "Educational planning",
        "Parent-child communication tips",
      ],
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 lg:px-8 py-8 space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <Badge variant="outline" className="bg-action/10 text-action border-action/20">
            <CreditCard className="mr-1 h-3 w-3" />
            Pricing & Packages
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            Choose Your Perfect Plan
          </h1>
          <p className="text-lg text-muted-foreground">
            Flexible packages designed to support your career journey at every stage
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {packages.map((pkg) => {
            const IconComponent = pkg.icon;
            const isPopular = pkg.popular;

            return (
              <Card
                key={pkg.id}
                className={`relative border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                  isPopular
                    ? "border-action/40 bg-gradient-to-br from-card to-action/5"
                    : "border-border hover:border-action/20"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-action text-action-foreground shadow-lg">
                      <Sparkles className="mr-1 h-3 w-3" />
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center space-y-4 pb-4">
                  <div
                    className={`inline-flex p-4 rounded-2xl mx-auto ${
                      isPopular ? "bg-action/10" : "bg-primary/10"
                    }`}
                  >
                    <IconComponent
                      className={`h-8 w-8 ${isPopular ? "text-action" : "text-primary"}`}
                    />
                  </div>

                  <div>
                    <CardTitle className="text-xl mb-2">{pkg.name}</CardTitle>
                    <CardDescription>{pkg.description}</CardDescription>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-sm text-muted-foreground">Rs</span>
                      <span
                        className={`text-4xl font-bold ${
                          isPopular ? "text-action" : "text-foreground"
                        }`}
                      >
                        {pkg.price.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">One-time payment</p>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {pkg.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div
                          className={`p-1 rounded-full ${
                            isPopular ? "bg-action/10" : "bg-primary/10"
                          } mt-0.5`}
                        >
                          <Check
                            className={`h-3 w-3 ${isPopular ? "text-action" : "text-primary"}`}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground flex-1">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={isPopular ? "action" : "outline"}
                    className="w-full"
                    onClick={() =>
                      handleSelectPackage({
                        id: pkg.id,
                        name: pkg.name,
                        price: pkg.price,
                      })
                    }
                  >
                    Select Package
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="mt-16 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Frequently Asked Questions</h2>
            <p className="text-muted-foreground">
              Everything you need to know about our packages
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg">Can I switch packages?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Yes! You can upgrade or change your package at any time. Contact our support team
                  for assistance.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg">What payment methods do you accept?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  We accept all major credit and debit cards including Visa, Mastercard, and UnionPay. Bank transfers and JazzCash/Easypaisa coming soon.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg">Is there a refund policy?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Yes, we offer a 7-day money-back guarantee if you're not satisfied with our
                  services.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg">Do you offer custom packages?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Absolutely! Contact us to discuss a tailored package that meets your specific
                  needs.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <Card className="border-2 border-action/40 bg-gradient-to-br from-card to-action/5 mt-16">
          <CardContent className="p-8 text-center space-y-4">
            <h3 className="text-2xl font-bold text-foreground">Need Help Choosing?</h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our team is here to help you select the perfect package for your career goals.
              Schedule a free consultation to discuss your needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button variant="action" size="lg">
                Schedule Free Consultation
              </Button>
              <Button variant="outline" size="lg">
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Payment Form Dialog */}
      <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-action" />
              Payment Details
            </DialogTitle>
            <DialogDescription>
              Complete your payment for <strong>{selectedPackage?.name}</strong>
            </DialogDescription>
          </DialogHeader>

          {selectedPackage && (
            <PaymentForm
              amount={selectedPackage.price}
              itemLabel={selectedPackage.name}
              onSuccess={() => {
                setShowPaymentForm(false);
                setShowSuccess(true);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-success/10 rounded-full">
                <CheckCircle2 className="h-12 w-12 text-success" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl">Payment Successful!</DialogTitle>
            <DialogDescription className="text-center">
              Your purchase of <strong>{selectedPackage?.name}</strong> has been confirmed.
              You will receive a confirmation email shortly.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-muted/30 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Package</span>
              <span className="font-medium">{selectedPackage?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount Paid</span>
              <span className="font-medium">Rs {selectedPackage?.price.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Transaction ID</span>
              <span className="font-medium font-mono text-xs">
                KRG-{Date.now().toString(36).toUpperCase()}
              </span>
            </div>
          </div>

          <Button
            variant="action"
            className="w-full"
            onClick={() => setShowSuccess(false)}
          >
            Continue
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Billing;
