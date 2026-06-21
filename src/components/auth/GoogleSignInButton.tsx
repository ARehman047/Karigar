import { useGoogleLogin } from "@react-oauth/google";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

// Official multi-color Google "G" logo.
const GoogleG = () => (
  <svg viewBox="0 0 48 48" className="h-6 w-6" aria-hidden="true">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
  </svg>
);

const GoogleButtonInner = () => {
  const { loginWithGoogle } = useAuth();
  const { toast } = useToast();

  const login = useGoogleLogin({
    scope: "openid email profile",
    onSuccess: async (tokenResponse) => {
      const result = await loginWithGoogle(tokenResponse.access_token);
      if (result.success) {
        toast({ title: "Welcome!", description: "Signed in with Google." });
      } else {
        toast({ title: "Sign-in failed", description: result.message, variant: "destructive" });
      }
    },
    onError: () => toast({ title: "Google sign-in failed", description: "Please try again.", variant: "destructive" }),
  });

  return (
    <button
      type="button"
      onClick={() => login()}
      className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary/40 hover:bg-secondary/50 text-left transition-all duration-200 hover:shadow-md"
    >
      <div className="p-3 rounded-xl bg-secondary">
        <GoogleG />
      </div>
      <div>
        <p className="font-semibold text-foreground">Continue with Google</p>
        <p className="text-sm text-muted-foreground">Sign in instantly with your Google account</p>
      </div>
    </button>
  );
};

/**
 * "Continue with Google" button styled to match the role-selection buttons.
 * Renders nothing when no client ID is configured.
 */
export const GoogleSignInButton = () => {
  if (!GOOGLE_CLIENT_ID) return null;
  return (
    <>
      <div className="relative my-1">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">or</span>
        </div>
      </div>
      <GoogleButtonInner />
    </>
  );
};
