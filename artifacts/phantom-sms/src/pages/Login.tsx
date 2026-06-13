import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Radio, Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Login() {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err?.message ?? "Sign-in failed. Make sure Google is enabled in your Firebase project.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center font-mono relative overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />

      {/* Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,255,0.05)_0%,transparent_70%)]" />

      <div className="relative z-10 w-full max-w-sm mx-4">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 shadow-[0_0_30px_rgba(0,255,255,0.2)] mb-6">
            <Radio className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-widest text-foreground uppercase">Phantom.SMS</h1>
          <p className="text-muted-foreground text-xs mt-2 tracking-wider uppercase">Gateway Control Panel</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-8 shadow-2xl shadow-black/50">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Secure Access</span>
          </div>

          <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
            Sign in with your Google account to access the gateway dashboard.
          </p>

          {error && (
            <div className="mb-6 px-4 py-3 rounded-lg border border-destructive/40 bg-destructive/10 text-xs text-destructive">
              {error}
            </div>
          )}

          <Button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 font-semibold py-3 rounded-xl transition-all shadow-sm hover:shadow-md"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-3 animate-spin" />
            ) : (
              <svg className="w-4 h-4 mr-3" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            Continue with Google
          </Button>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Access restricted to authorized accounts only
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground/40 mt-8 uppercase tracking-widest">
          Phantom Business © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
