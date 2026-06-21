import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { authApi } from "@/lib/services";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";

/** Danger zone: lets a student or mentor permanently delete their own account. */
export const DeleteAccountCard = () => {
  const { logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleDelete = async () => {
    setBusy(true);
    try {
      await authApi.deleteAccount();
      toast({ title: "Account deleted", description: "Your account has been removed. We're sorry to see you go." });
      logout();
      navigate("/");
    } catch (err) {
      toast({ title: "Couldn't delete account", description: (err as Error).message, variant: "destructive" });
      setBusy(false);
    }
  };

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="text-base text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> Danger Zone
        </CardTitle>
        <CardDescription>Permanently delete your account and profile. This can't be undone.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="destructive" className="gap-2" onClick={() => setOpen(true)}>
          <Trash2 className="h-4 w-4" /> Delete My Account
        </Button>
      </CardContent>

      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This permanently removes your account and profile. Your past sessions will remain in the other
              participants' history (shown as a former member). This action can't be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Keep Account</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={busy} className="gap-1">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
