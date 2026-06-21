import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star, Loader2 } from "lucide-react";
import { sessionApi } from "@/lib/services";
import { useToast } from "@/hooks/use-toast";

interface RatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  mentorName: string;
  onSubmitted?: () => void;
}

export const RatingDialog = ({ open, onOpenChange, sessionId, mentorName, onSubmitted }: RatingDialogProps) => {
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (rating < 1) {
      toast({ title: "Pick a rating", description: "Please select 1–5 stars.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await sessionApi.submitReview(sessionId, rating, comment.trim());
      toast({ title: "Thanks for your feedback!", description: `Your review for ${mentorName} has been recorded.` });
      onOpenChange(false);
      onSubmitted?.();
    } catch (err) {
      toast({ title: "Couldn't submit review", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rate your session</DialogTitle>
          <DialogDescription>How was your session with {mentorName}? Your rating helps other students.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                className="p-1"
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
              >
                <Star className={`h-8 w-8 transition-colors ${(hover || rating) >= n ? "fill-warning text-warning" : "text-muted-foreground/40"}`} />
              </button>
            ))}
          </div>
          <div className="w-full space-y-1.5">
            <Label htmlFor="review">Review (optional)</Label>
            <Textarea id="review" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share a few words about your experience…" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Skip</Button>
          <Button variant="action" onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
