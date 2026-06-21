import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { BadgeChip } from "@/components/mentor/BadgeChip";
import { useToast } from "@/hooks/use-toast";
import { badgeApi, paymentApi, type MyBadgeStatus, type BankDetails, type BadgeTier } from "@/lib/services";
import { Award, Loader2, Upload, Landmark, Clock } from "lucide-react";

export const MentorBadgeCard = () => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<MyBadgeStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const [applyTier, setApplyTier] = useState<BadgeTier | null>(null);
  const [bank, setBank] = useState<BankDetails | null>(null);
  const [receipt, setReceipt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refresh = () => badgeApi.getMine().then(setStatus).catch(() => setStatus(null)).finally(() => setLoading(false));

  useEffect(() => {
    refresh();
  }, []);

  const openApply = async (tier: BadgeTier) => {
    setApplyTier(tier);
    setReceipt("");
    if (!bank) setBank(await paymentApi.getBankDetails().catch(() => null));
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload a receipt under 8 MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setReceipt(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const submitApply = async () => {
    if (!applyTier || !receipt) return;
    setSubmitting(true);
    try {
      await badgeApi.apply(applyTier, receipt);
      toast({ title: "Application submitted", description: "The admin will verify your payment and review your profile." });
      setApplyTier(null);
      refresh();
    } catch (err) {
      toast({ title: "Couldn't submit", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="p-5 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading badge status…
        </CardContent>
      </Card>
    );
  }
  if (!status) return null;

  const fee = (t: BadgeTier) => status.rules[t].fee.toLocaleString();

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Award className="h-5 w-5 text-action" />
          Mentor Badge
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Current:</span>
            {status.badge === "none" ? (
              <span className="text-sm font-medium text-foreground">No badge yet</span>
            ) : (
              <BadgeChip badge={status.badge} />
            )}
          </div>
          <span className="text-sm text-muted-foreground">{status.completedSessions} completed sessions</span>
        </div>

        <p className="text-xs text-muted-foreground">
          Earn a <strong>Silver</strong> badge at {status.rules.silver.threshold} completed sessions and{" "}
          <strong>Gold</strong> at {status.rules.gold.threshold} (admin-reviewed) — or apply any time by paying the
          badge fee.
        </p>

        {status.pendingRequest ? (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
            <Clock className="h-4 w-4 shrink-0" />
            Your <strong className="capitalize">{status.pendingRequest.badge}</strong> badge request is under review.
          </div>
        ) : status.badge === "gold" ? (
          <p className="text-sm text-green-700">You hold the highest badge. 🏅</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {status.badge === "none" && (
              <Button variant="outline" size="sm" onClick={() => openApply("silver")}>
                Apply for Silver — Rs {fee("silver")}
              </Button>
            )}
            <Button variant="action" size="sm" onClick={() => openApply("gold")}>
              Apply for Gold — Rs {fee("gold")}
            </Button>
          </div>
        )}
      </CardContent>

      {/* Apply dialog */}
      <Dialog open={!!applyTier} onOpenChange={(o) => !o && setApplyTier(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="capitalize">Apply for {applyTier} badge</DialogTitle>
            <DialogDescription>
              Transfer the Rs {applyTier ? fee(applyTier) : ""} fee to the account below, then upload your receipt.
              The admin will verify it and review your profile before awarding the badge.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Bank details */}
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <div className="flex items-center gap-2 font-medium text-foreground mb-1">
                <Landmark className="h-4 w-4 text-primary" /> Bank Transfer —{" "}
                <span className="text-action font-semibold">Rs {applyTier ? fee(applyTier) : ""}</span>
              </div>
              {bank && bank.accounts.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Pay to any one of these accounts:</p>
                  {bank.accounts.map((acc, i) => (
                    <div key={i} className="rounded-md bg-background border border-border p-2 space-y-0.5 text-muted-foreground">
                      {acc.bankName && <p>Bank: <span className="text-foreground font-medium">{acc.bankName}</span></p>}
                      {acc.accountTitle && <p>Title: <span className="text-foreground font-medium">{acc.accountTitle}</span></p>}
                      {acc.accountNumber && <p>Account: <span className="text-foreground font-medium">{acc.accountNumber}</span></p>}
                      {acc.iban && <p>IBAN: <span className="text-foreground font-medium">{acc.iban}</span></p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-amber-700">Bank details aren't configured yet — please contact support.</p>
              )}
            </div>

            {/* Receipt upload */}
            <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFile} />
            {receipt ? (
              <div className="space-y-2">
                {receipt.startsWith("data:image") ? (
                  <img src={receipt} alt="Receipt" className="max-h-40 w-full object-contain rounded-lg border border-border" />
                ) : (
                  <p className="text-sm text-muted-foreground">Receipt attached.</p>
                )}
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>Replace</Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors py-6 flex flex-col items-center gap-1.5 text-muted-foreground"
              >
                <Upload className="h-6 w-6" />
                <span className="text-sm font-medium">Upload payment receipt</span>
                <span className="text-xs">PNG, JPG, or PDF</span>
              </button>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyTier(null)}>Cancel</Button>
            <Button variant="action" onClick={submitApply} disabled={!receipt || submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Submit Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
