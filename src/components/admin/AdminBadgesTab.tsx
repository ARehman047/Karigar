import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { BadgeChip } from "@/components/mentor/BadgeChip";
import { useToast } from "@/hooks/use-toast";
import { openDataUrl } from "@/lib/file";
import { badgeApi, adminApi, mentorApi, type BadgeRequestRow, type MentorReview } from "@/lib/services";
import type { Mentor } from "@/types";
import { Link } from "react-router-dom";
import { Award, FileText, Star, MessageSquare, Loader2, CheckCircle2, ExternalLink } from "lucide-react";

export const AdminBadgesTab = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<BadgeRequestRow[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Decline dialog
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  // Reviews dialog
  const [reviewsFor, setReviewsFor] = useState<BadgeRequestRow | null>(null);
  const [reviews, setReviews] = useState<MentorReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Direct grant
  const [grantMentorId, setGrantMentorId] = useState<string>("");
  const [grantBadgeTier, setGrantBadgeTier] = useState<"silver" | "gold" | "none">("silver");
  const [granting, setGranting] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([badgeApi.listRequests("pending"), adminApi.mentors().catch(() => [])])
      .then(([reqs, ms]) => {
        setRequests(reqs);
        setMentors((ms as Mentor[]).filter((m) => m.isApproved));
      })
      .catch((err) => toast({ title: "Failed to load badge requests", description: err.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const approve = async (id: string) => {
    setBusyId(id);
    try {
      await badgeApi.approve(id);
      toast({ title: "Badge approved", description: "The mentor has been awarded the badge and emailed." });
      load();
    } catch (err) {
      toast({ title: "Action failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const submitDecline = async () => {
    if (!declineId) return;
    if (!declineReason.trim()) {
      toast({ title: "Reason required", description: "Please give a reason — it's emailed to the mentor.", variant: "destructive" });
      return;
    }
    setBusyId(declineId);
    try {
      await badgeApi.decline(declineId, declineReason.trim());
      toast({ title: "Request declined", description: "The mentor has been emailed the reason." });
      setDeclineId(null);
      setDeclineReason("");
      load();
    } catch (err) {
      toast({ title: "Action failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const viewReceipt = async (id: string) => {
    setBusyId(id);
    try {
      const img = await badgeApi.getReceipt(id);
      if (!img) {
        toast({ title: "No receipt", description: "No receipt attached to this request.", variant: "destructive" });
        return;
      }
      openDataUrl(img);
    } catch (err) {
      toast({ title: "Couldn't load receipt", description: (err as Error).message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const openReviews = async (req: BadgeRequestRow) => {
    setReviewsFor(req);
    setReviews([]);
    if (!req.mentor.profileId) return;
    setReviewsLoading(true);
    try {
      setReviews(await mentorApi.getReviews(req.mentor.profileId));
    } catch {
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  };

  const doGrant = async () => {
    if (!grantMentorId) {
      toast({ title: "Pick a mentor", description: "Select a mentor to grant a badge to.", variant: "destructive" });
      return;
    }
    setGranting(true);
    try {
      await badgeApi.grant(grantMentorId, grantBadgeTier);
      toast({
        title: grantBadgeTier === "none" ? "Badge removed" : "Badge granted",
        description: grantBadgeTier === "none" ? "The mentor's badge was removed." : `Awarded the ${grantBadgeTier} badge.`,
      });
      setGrantMentorId("");
      load();
    } catch (err) {
      toast({ title: "Action failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setGranting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Direct grant */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="h-5 w-5 text-action" /> Grant a Badge Directly
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label>Mentor</Label>
              <Select value={grantMentorId} onValueChange={setGrantMentorId}>
                <SelectTrigger><SelectValue placeholder="Select a mentor" /></SelectTrigger>
                <SelectContent>
                  {mentors.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} {m.badge && m.badge !== "none" ? `(${m.badge})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Badge</Label>
              <Select value={grantBadgeTier} onValueChange={(v) => setGrantBadgeTier(v as typeof grantBadgeTier)}>
                <SelectTrigger className="sm:w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="silver">Silver</SelectItem>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="none">Remove badge</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="action" onClick={doGrant} disabled={granting}>
              {granting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pending requests */}
      <Card className="border-border">
        <CardHeader><CardTitle>Pending Badge Requests</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : requests.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-500/60 mx-auto mb-3" />
              <p className="text-muted-foreground">No pending badge requests.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((r) => (
                <div key={r.id} className="rounded-xl border border-border p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">{r.mentor.name}</span>
                        <span className="text-sm text-muted-foreground">wants</span>
                        <BadgeChip badge={r.badge} />
                        <span className="text-xs rounded-full bg-muted px-2 py-0.5 text-muted-foreground capitalize">
                          {r.source === "eligibility" ? "auto-eligible" : r.source === "application" ? "paid application" : r.source}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{r.mentor.email}</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      Current: <BadgeChip badge={r.mentor.currentBadge} showLabel />
                      {r.mentor.currentBadge === "none" && <span>none</span>}
                    </div>
                  </div>

                  {/* Stats — Completed + Rejected + Cancelled + Pending = Total ({r.mentor.total}) */}
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center text-xs">
                    {[
                      { label: "Completed", value: r.mentor.completed, cls: "text-green-700 bg-green-50" },
                      { label: "Rejected", value: r.mentor.rejected, cls: "text-red-700 bg-red-50" },
                      { label: "Cancelled", value: r.mentor.cancelled, cls: "text-amber-700 bg-amber-50" },
                      { label: "Pending", value: r.mentor.pending, cls: "text-blue-700 bg-blue-50" },
                      { label: "Rating", value: r.mentor.rating.toFixed(1), cls: "text-yellow-700 bg-yellow-50" },
                    ].map((s) => (
                      <div key={s.label} className={`rounded-lg py-2 ${s.cls}`}>
                        <p className="font-bold text-sm">{s.value}</p>
                        <p>{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {r.mentor.total} total session{r.mentor.total !== 1 ? "s" : ""} · {r.mentor.reviewsCount} review
                    {r.mentor.reviewsCount !== 1 ? "s" : ""}
                  </p>

                  {r.source === "application" && r.fee ? (
                    <p className="text-xs text-muted-foreground">Application fee: <strong>Rs {r.fee.toLocaleString()}</strong></p>
                  ) : null}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {r.hasReceipt && (
                      <Button size="sm" variant="outline" className="text-xs gap-1" disabled={busyId === r.id} onClick={() => viewReceipt(r.id)}>
                        <FileText className="h-3.5 w-3.5" /> Receipt
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => openReviews(r)}>
                      <MessageSquare className="h-3.5 w-3.5" /> Reviews ({r.mentor.reviewsCount})
                    </Button>
                    {r.mentor.profileId && (
                      <Button size="sm" variant="outline" className="text-xs gap-1" asChild>
                        <Link to={`/mentor/${r.mentor.profileId}`} target="_blank">
                          <ExternalLink className="h-3.5 w-3.5" /> Profile
                        </Link>
                      </Button>
                    )}
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs" disabled={busyId === r.id} onClick={() => approve(r.id)}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => { setDeclineId(r.id); setDeclineReason(""); }}>
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Decline dialog */}
      <Dialog open={!!declineId} onOpenChange={(o) => !o && setDeclineId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Badge Request</DialogTitle>
            <DialogDescription>The reason will be emailed to the mentor.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="badge-decline-reason">Reason *</Label>
            <textarea
              id="badge-decline-reason"
              rows={4}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              className="w-full rounded-md border border-border bg-background p-2 text-sm"
              placeholder="e.g. Insufficient positive reviews / payment not verified…"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={submitDecline} disabled={!!busyId}>Decline & Email</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reviews dialog */}
      <Dialog open={!!reviewsFor} onOpenChange={(o) => !o && setReviewsFor(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Reviews — {reviewsFor?.mentor.name}</DialogTitle>
            <DialogDescription>Student feedback used to assess this mentor.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-3">
            {reviewsLoading ? (
              <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No reviews yet for this mentor.</p>
            ) : (
              reviews.map((rev) => (
                <div key={rev.id} className="border-b border-border last:border-0 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-foreground">{rev.studentName}</span>
                    <span className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={`h-3.5 w-3.5 ${n <= rev.rating ? "fill-warning text-warning" : "text-muted-foreground/30"}`} />
                      ))}
                    </span>
                  </div>
                  {rev.comment && <p className="text-sm text-muted-foreground mt-1">{rev.comment}</p>}
                  <p className="text-xs text-muted-foreground/70 mt-0.5">{new Date(rev.createdAt).toLocaleDateString()}</p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
