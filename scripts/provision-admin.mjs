import { createClient } from "@supabase/supabase-js";

const email = process.argv[2]?.trim().toLowerCase();
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Usage: npm run provision:admin -- account@example.com");
  process.exitCode = 1;
} else if (!supabaseUrl || !serviceRoleKey) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the local .env file.");
  process.exitCode = 1;
} else {
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    let account;
    for (let page = 1; page <= 100; page += 1) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error(`Could not look up accounts: ${error.message}`);

      account = data.users.find((user) => user.email?.toLowerCase() === email);
      if (account || data.users.length < 1000) break;
    }

    if (!account) throw new Error(`No account found for ${email}. Create it at /auth first.`);
    if (!account.email_confirmed_at) {
      throw new Error(`Confirm ${email} before granting admin access.`);
    }

    const { error } = await supabase
      .from("user_roles")
      .upsert({ user_id: account.id, role: "admin" }, { onConflict: "user_id,role" });
    if (error) {
      throw new Error(`Could not grant admin access: ${error.message}. Check that database migrations are applied.`);
    }

    console.log(`Admin access granted to ${email}. Keep the service-role key only in the private server-side .env file.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Admin provisioning failed.");
    process.exitCode = 1;
  }
}
