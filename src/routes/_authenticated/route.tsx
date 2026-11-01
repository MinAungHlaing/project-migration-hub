import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { hasLocalDemoSession, isLocalDemo } from "@/lib/local-demo";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (isLocalDemo) {
      if (!hasLocalDemoSession()) throw redirect({ to: "/auth" });
      return;
    }
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: () => <Outlet />,
});
