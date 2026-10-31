import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password — GTM Catalog" },
      { name: "description", content: "Set a new password for your GTM admin account." },
      { property: "og:title", content: "Reset password — GTM Catalog" },
      { property: "og:description", content: "Set a new password for your GTM admin account." },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated.");
    navigate({ to: "/admin" });
  }
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={save} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Choose a new password</h1>
        <div className="grid gap-1.5"><Label htmlFor="pw">New password</Label><Input id="pw" type="password" minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} /></div>
        <Button className="w-full" disabled={busy}>{busy ? "Saving…" : "Save password"}</Button>
      </form>
    </div>
  );
}
