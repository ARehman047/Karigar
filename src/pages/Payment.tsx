import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { sessionApi, paymentApi, type BankDetails } from "@/lib/services";
import { formatTime12h } from "@/lib/session";
import type { Session } from "@/types";
import {
  ArrowLeft, CheckCircle2, XCircle, Calendar, Clock, User, BookOpen, AlertCircle,
  Loader2, Building2, Copy, Check, Upload, FileText, Landmark,
} from "lucide-react";

type PaymentStep = "details" | "processing" | "success" | "failed";

const PaymentPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [session, setSession] = useState<Session | null>(null);
  const [bank, setBank] = useState<BankDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<PaymentStep>("details");
  const [copied, setCopied] = useState<string | null>(null);

  const [receipt, setReceipt] = useState<string>(""); // base64 data URL
  const [receiptName, setReceiptName] = useState<string>("");
  const [isImage, setIsImage] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    Promise.all([sessionApi.get(sessionId), paymentApi.getBankDetails().catch(() => null)])
      .then(([s, b]) => {
        setSession(s);
        setBank(b);
      })
      .catch((err) => {
        setSession(null);
        toast({ title: "Failed to load session", description: err.message, variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, [sessionId, toast]);

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied((c) => (c === label ? null : c)), 1500);
    } catch {
      /* clipboard may be blocked; ignore */
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload a receipt under 8 MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setReceipt(dataUrl);
      setReceiptName(file.name);
      setIsImage(file.type.startsWith("image/"));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSubmit = async () => {
    if (!session) return;
    if (!receipt) {
      toast({ title: "Receipt required", description: "Please upload your payment receipt first.", variant: "destructive" });
      return;
    }
    setStep("processing");
    try {
      await paymentApi.process(session.id, receipt);
      setStep("success");
      setTimeout(() => navigate("/sessions"), 2500);
    } catch (err) {
      toast({ title: "Submission failed", description: (err as Error).message, variant: "destructive" });
      setStep("failed");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto py-16 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto py-16 text-center space-y-4">
          <h1 className="text-2xl font-bold">Session Not Found</h1>
          <Button asChild><Link to="/dashboard">Go to Dashboard</Link></Button>
        </div>
      </div>
    );
  }

  const hasBank = !!(bank && bank.accounts.length > 0);

  // A single copyable detail row. `id` must be unique across all accounts so the
  // "Copied" state highlights only the row that was copied.
  const DetailRow = ({ id, label, value }: { id: string; label: string; value?: string }) =>
    value ? (
      <div className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-semibold text-foreground break-all">{value}</p>
        </div>
        <Button type="button" variant="ghost" size="sm" className="shrink-0 gap-1" onClick={() => copy(id, value)}>
          {copied === id ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          {copied === id ? "Copied" : "Copy"}
        </Button>
      </div>
    ) : null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-lg">
        <Button variant="ghost" size="sm" className="mb-4 gap-1" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        {/* Session Summary */}
        <Card className="border-border mb-6">
          <CardContent className="p-5">
            <h2 className="font-semibold text-foreground mb-3">Session Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Mentor: <strong className="text-foreground">{session.mentorName}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <BookOpen className="h-4 w-4" />
                <span>Topic: <strong className="text-foreground">{session.topic}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{session.date}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{formatTime12h(session.time)} • {session.duration} minutes</span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="font-semibold text-foreground text-base">Amount to Transfer</span>
                <span className="font-bold text-xl text-action">Rs {session.amount.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Processing */}
        {step === "processing" && (
          <Card className="border-border">
            <CardContent className="py-16 text-center space-y-4">
              <div className="h-12 w-12 mx-auto border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="font-semibold text-foreground">Submitting your receipt…</p>
              <p className="text-sm text-muted-foreground">Please do not close this page</p>
            </CardContent>
          </Card>
        )}

        {/* Success */}
        {step === "success" && (
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="py-10 text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 mx-auto text-green-600" />
              <div>
                <h2 className="text-xl font-bold text-green-800">Receipt Submitted!</h2>
                <p className="text-green-700 mt-1">We've received your payment proof.</p>
              </div>
              <div className="bg-white rounded-xl p-4 text-sm space-y-2 text-left border border-green-100">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-semibold text-green-700">Rs {session.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge className="bg-yellow-100 text-yellow-700">Awaiting verification</Badge>
                </div>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700 text-left">
                <AlertCircle className="h-4 w-4 inline mr-1" />
                The admin will verify your transfer. Once confirmed, your request is sent to the mentor to accept —
                you'll be notified by email at each step.
              </div>
              <Button variant="action" asChild className="w-full">
                <Link to="/sessions">View My Sessions</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Failed */}
        {step === "failed" && (
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="py-10 text-center space-y-4">
              <XCircle className="h-16 w-16 mx-auto text-red-500" />
              <div>
                <h2 className="text-xl font-bold text-red-800">Submission Failed</h2>
                <p className="text-red-700 mt-1">Something went wrong. Please try again.</p>
              </div>
              <Button variant="outline" onClick={() => setStep("details")} className="w-full border-red-200 text-red-700">
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Bank transfer + receipt upload */}
        {step === "details" && (
          <div className="space-y-6">
            {/* Bank details */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-primary" />
                  Bank Transfer Details
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Transfer the exact amount to the account below, then upload your receipt.
                </p>
              </CardHeader>
              <CardContent>
                {hasBank ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Transfer <strong className="text-action">Rs {session.amount.toLocaleString()}</strong> to{" "}
                      <strong className="text-foreground">any one</strong> of these accounts:
                    </p>
                    {bank!.accounts.map((acc, i) => (
                      <div key={i} className="rounded-lg border border-border bg-muted/30 px-4">
                        <DetailRow id={`${i}-bank`} label="Bank" value={acc.bankName} />
                        <DetailRow id={`${i}-title`} label="Account Title" value={acc.accountTitle} />
                        <DetailRow id={`${i}-number`} label="Account Number" value={acc.accountNumber} />
                        <DetailRow id={`${i}-iban`} label="IBAN" value={acc.iban} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                    <Building2 className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>Bank details aren't configured yet. Please check back shortly or contact support.</span>
                  </div>
                )}
                {bank?.note && <p className="mt-3 text-xs text-muted-foreground">{bank.note}</p>}
              </CardContent>
            </Card>

            {/* Receipt upload */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  Upload Payment Receipt
                </CardTitle>
                <p className="text-sm text-muted-foreground">Screenshot or photo of your transfer confirmation (image or PDF, max 8 MB).</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleFile}
                />

                {!receipt ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-secondary/40 transition-colors py-10 flex flex-col items-center gap-2 text-muted-foreground"
                  >
                    <Upload className="h-7 w-7" />
                    <span className="text-sm font-medium">Click to upload your receipt</span>
                    <span className="text-xs">PNG, JPG, or PDF</span>
                  </button>
                ) : (
                  <div className="space-y-3">
                    {isImage ? (
                      <img src={receipt} alt="Receipt preview" className="max-h-64 w-full object-contain rounded-lg border border-border bg-muted/30" />
                    ) : (
                      <div className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
                        <FileText className="h-5 w-5 text-primary" />
                        <span className="truncate">{receiptName || "receipt.pdf"}</span>
                      </div>
                    )}
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      Replace receipt
                    </Button>
                  </div>
                )}

                <Button
                  type="button"
                  variant="action"
                  className="w-full"
                  size="lg"
                  disabled={!receipt || !hasBank}
                  onClick={handleSubmit}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  I've Paid — Submit Receipt
                </Button>
                {!hasBank && (
                  <p className="text-center text-xs text-muted-foreground">Submission opens once bank details are available.</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default PaymentPage;
