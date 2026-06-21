import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { sessionApi } from "@/lib/services";
import { useToast } from "@/hooks/use-toast";
import { Star, MessageSquare, Loader2 } from "lucide-react";

interface ReviewData {
  rating: number;
  comment: string;
  studentName: string;
  createdAt: string | null;
}

/** "See Review" button + dialog — fetches the review left for a session. */
export const SessionReviewButton = ({ sessionId }: { sessionId: string }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [review, setReview] = useState<ReviewData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const openDialog = async () => {
    setOpen(true);
    if (loaded) return;
    setLoading(true);
    try {
      setReview((await sessionApi.getReview(sessionId)) as ReviewData | null);
      setLoaded(true);
    } catch (err) {
      toast({ title: "Couldn't load review", description: (err as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button size="sm" variant="outline" className="gap-1" onClick={openDialog}>
        <MessageSquare className="h-4 w-4" /> See Review
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Student Review</DialogTitle>
            <DialogDescription>Feedback the student left for this session.</DialogDescription>
          </DialogHeader>
          {loading ? (
            <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : !review ? (
            <p className="py-6 text-center text-sm text-muted-foreground">This session hasn't been reviewed yet.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">{review.studentName}</span>
                <span className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={`h-4 w-4 ${n <= review.rating ? "fill-warning text-warning" : "text-muted-foreground/30"}`} />
                  ))}
                </span>
              </div>
              {review.comment ? (
                <p className="text-sm text-muted-foreground leading-relaxed bg-muted/40 rounded-lg p-3">{review.comment}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No written comment.</p>
              )}
              {review.createdAt && (
                <p className="text-xs text-muted-foreground/70">{new Date(review.createdAt).toLocaleDateString()}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
