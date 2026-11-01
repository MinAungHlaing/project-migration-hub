import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { hasLocalDemoSession, isLocalDemo, localDemoCredentials, startLocalDemoSession } from "@/lib/local-demo";

const isLocalSupabase = isLocalDemo || ["localhost", "127.0.0.1", "::1"].includes(
  new URL(import.meta.env.VITE_SUPABASE_URL || "http://localhost").hostname,
);

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Admin sign in — GTM Catalog" },
      { name: "description", content: "Sign in to manage the GTM catalog, orders and stock." },
      { property: "og:title", content: "Admin sign in — GTM Catalog" },
      { property: "og:description", content: "Sign in to the GTM admin workspace." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState(isLocalDemo ? localDemoCredentials.email : "");
  const [password, setPassword] = useState(isLocalDemo ? localDemoCredentials.password : "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isLocalDemo) {
      if (hasLocalDemoSession()) navigate({ to: "/admin" });
      return;
    }
    supabase.auth.getUser().then(({ data }) => { if (data.user) navigate({ to: "/admin" }); });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (isLocalDemo) {
        if (mode !== "signin") return;
        if (email !== localDemoCredentials.email || password !== localDemoCredentials.password) {
          throw new Error("Incorrect demo email or password.");
        }
        startLocalDemoSession();
        navigate({ to: "/admin" });
        return;
      }
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/admin" });
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/admin` } });
        if (error) throw error;
        toast.success(isLocalSupabase
          ? "Account created. Admin access must be provisioned separately."
          : "Check your email to confirm your account, then sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        toast.success("If that email has an account, a reset link is on its way.");
        setMode("signin");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function enterLocalDemo() {
    startLocalDemoSession();
    navigate({ to: "/admin" });
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error(r.error.message ?? "Google sign-in failed.");
    else if (!r.redirected) navigate({ to: "/admin" });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hero-panel hidden flex-col justify-between p-12 lg:flex">
        {isLocalDemo
          ? <span className="font-display text-lg font-semibold">GTM Catalog</span>
          : <Link to="/" className="font-display text-lg font-semibold">GTM Catalog</Link>}
        <div>
          <h1 className="text-4xl font-bold">Keep your catalog accurate and your team moving.</h1>
          <p className="mt-3 opacity-85">Products, orders, deliveries and stock — in one workspace.</p>
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div>
            <h2 className="text-2xl font-bold">{mode === "signin" ? "Admin sign in" : mode === "signup" ? "Create account" : "Reset password"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isLocalDemo
                ? "No database setup needed. Open the local admin walkthrough to explore the screens."
                : mode === "signup"
                ? "Creating an account does not grant admin access. An existing owner must provision that separately."
                : isLocalSupabase
                  ? "Sign in with an account in your local Supabase instance."
                  : "Use the email for your GTM admin account."}
            </p>
            {isLocalDemo && <p className="mt-2 rounded-md bg-muted p-3 text-sm">This is a local-only preview. It does not connect to a real account or database.</p>}
          </div>
          {isLocalDemo ? (
            <Button type="button" className="w-full" onClick={enterLocalDemo}>Open local admin preview</Button>
          ) : (
            <>
              <div className="grid gap-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              {mode !== "forgot" && (
                <div className="grid gap-1.5"><Label htmlFor="pw">Password</Label><Input id="pw" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              )}
              <Button type="submit" className="w-full" disabled={busy}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}</Button>
            </>
          )}
          {mode !== "forgot" && !isLocalSupabase && <Button type="button" variant="outline" className="w-full" onClick={google}>Continue with Google</Button>}
          {!isLocalDemo && <div className="flex justify-between text-sm">
            {mode === "signin" ? (
              <>
                <button type="button" className="text-primary hover:underline" onClick={() => setMode("signup")}>Create account</button>
                <button type="button" className="text-muted-foreground hover:underline" onClick={() => setMode("forgot")}>Forgot password?</button>
              </>
            ) : (
              <button type="button" className="text-primary hover:underline" onClick={() => setMode("signin")}>Back to sign in</button>
            )}
          </div>}
        </form>
      </div>
    </div>
  );
}
