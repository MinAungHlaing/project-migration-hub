import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Session-less publishable client for public reads (RLS applies as anon). Call only inside server handlers. */
export function publicClient(): SupabaseClient<Database> {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

/** Privileged client, loaded lazily so it never reaches the browser bundle. */
export async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Verifies the signed-in caller holds the admin role, then returns the privileged client and actor label. */
export async function requireAdmin(context: { supabase: SupabaseClient<Database>; userId: string; claims?: unknown }) {
  const { data: isAdmin, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || !isAdmin) throw new Error("You need admin access for this.");
  const claims = (context.claims ?? {}) as { email?: string };
  return { db: await adminClient(), actor: claims.email || context.userId };
}

export function rpcError(e: { message?: string } | null): never {
  throw new Error(e?.message || "Something went wrong.");
}
