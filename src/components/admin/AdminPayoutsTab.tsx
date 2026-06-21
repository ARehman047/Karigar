import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { paymentApi, type PayoutRow, type PayoutHistoryRow } from "@/lib/services";
import { Loader2, Landmark, Upload, CheckCircle2, Send } from "lucide-react";

export const AdminPayoutsTab = () => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [history, setHistory] = useState<PayoutHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [payRow, setPayRow] = useState<PayoutRow | null>(null);
  const [receipt, setReceipt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([paymentApi.listPayouts(), paymentApi.payoutHistory().catch(() => [])])
      .then(([pending, hist]) => {
        setRows(pending);
        setHistory(hist as PayoutHistoryRow[]);
      })
      .catch((err) => toast({ title: "Failed to load payouts", description: err.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openPay = (row: PayoutRow) => {
    setPayRow(row);
    setReceipt("");
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

  const submitPayout = async () => {
    if (!payRow?.paymentId || !receipt) return;
    setSubmitting(true);
    try {
      await paymentApi.sendPayout(payRow.paymentId, receipt);
      toast({ title: "Payout sent", description: "The mentor has been notified to review and accept the session." });
      setPayRow(null);
      load();
    } catch (err) {
      toast({ title: "Couldn't send payout", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
    <Card className="border-border">
      <CardHeader>
        <CardTitle>Mentor Payouts</CardTitle>
        <p className="text-sm text-muted-foreground">
          After a student's payment is confirmed, send the mentor their share — then the request is forwarded to the mentor.
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center">
            <CheckCircle2 className="h-10 w-10 text-green-500/60 mx-auto mb-3" />
            <p className="text-muted-foreground">No payouts pending.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-left">
                  <th className="pb-3 pr-4">Student</th>
                  <th className="pb-3 pr-4">Mentor</th>
                  <th className="pb-3 pr-4">Service</th>
                  <th className="pb-3 pr-4">Mentor gets</th>
                  <th className="pb-3 pr-4">Stage</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.sessionId} className="py-3">
                    <td className="py-3 pr-4 font-medium">{r.studentName}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{r.mentorName}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{r.packageName || "—"}</td>
                    <td className="py-3 pr-4 font-semibold text-action">Rs {r.mentorPayout.toLocaleString()}</td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.canPay ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
                        {r.canPay ? "Payment confirmed" : "Awaiting payment confirmation"}
                      </span>
                    </td>
                    <td className="py-3">
                      <Button
                        size="sm"
                        className="text-xs gap-1"
                        variant={r.canPay ? "action" : "outline"}
                        disabled={!r.canPay}
                        onClick={() => openPay(r)}
                        title={r.canPay ? "Send the mentor their payout" : "Confirm the student's payment first"}
                      >
                        <Send className="h-3.5 w-3.5" /> Send Mentor Payment
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {/* Pay dialog */}
      <Dialog open={!!payRow} onOpenChange={(o) => !o && setPayRow(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send mentor payment</DialogTitle>
            <DialogDescription>
              Transfer <strong className="text-action">Rs {payRow?.mentorPayout.toLocaleString()}</strong> to{" "}
              {payRow?.mentorName} at one of their accounts below, then attach the payout receipt. The session request is
              forwarded to the mentor once you send it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Mentor bank accounts */}
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <div className="flex items-center gap-2 font-medium text-foreground mb-1">
                <Landmark className="h-4 w-4 text-primary" /> Mentor's account(s)
              </div>
              {payRow?.mentorBankAccounts.length ? (
                <div className="space-y-2">
                  {payRow.mentorBankAccounts.map((acc, i) => (
                    <div key={i} className="rounded-md bg-background border border-border p-2 space-y-0.5 text-muted-foreground">
                      {acc.bankName && <p>Bank: <span className="text-foreground font-medium">{acc.bankName}</span></p>}
                      {acc.accountTitle && <p>Title: <span className="text-foreground font-medium">{acc.accountTitle}</span></p>}
                      {acc.accountNumber && <p>Account: <span className="text-foreground font-medium">{acc.accountNumber}</span></p>}
                      {acc.iban && <p>IBAN: <span className="text-foreground font-medium">{acc.iban}</span></p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-amber-700">This mentor hasn't added a payout account yet.</p>
              )}
            </div>

            {/* Receipt upload */}
            <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFile} />
            {receipt ? (
              <div className="space-y-2">
                {receipt.startsWith("data:image") ? (
                  <img src={receipt} alt="Payout receipt" className="max-h-40 w-full object-contain rounded-lg border border-border" />
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
                <span className="text-sm font-medium">Upload payout receipt</span>
                <span className="text-xs">PNG, JPG, or PDF</span>
              </button>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayRow(null)}>Cancel</Button>
            <Button variant="action" onClick={submitPayout} disabled={!receipt || submitting} className="gap-1">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>

    {/* Completed payouts (history) */}
    <Card className="border-border">
      <CardHeader>
        <CardTitle>Completed Payouts</CardTitle>
        <p className="text-sm text-muted-foreground">Mentors already paid for conducted sessions.</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : history.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">No payouts made yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-left">
                  <th className="pb-3 pr-4">Mentor</th>
                  <th className="pb-3 pr-4">Student</th>
                  <th className="pb-3 pr-4">Service</th>
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3">Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.map((h) => (
                  <tr key={h.paymentId} className="py-3">
                    <td className="py-3 pr-4 font-medium">{h.mentorName}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{h.studentName}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{h.packageName || h.topic || "—"}</td>
                    <td className="py-3 pr-4 text-muted-foreground text-xs">{h.date}</td>
                    <td className="py-3 font-semibold text-action">Rs {h.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
};
