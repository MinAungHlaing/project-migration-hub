import { createFileRoute } from "@tanstack/react-router";

// Public retail/wholesale price history (supplier cost columns are never exposed).
export const Route = createFileRoute("/api/price-history")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { publicClient } = await import("@/lib/server-clients");
        const pid = new URL(request.url).searchParams.get("product_id");
        let q = publicClient().from("price_history")
          .select("id, product_id, product_name, old_retail, new_retail, old_wholesale, new_wholesale, changed_at")
          .order("changed_at", { ascending: false }).limit(1000);
        if (pid) q = q.eq("product_id", pid);
        const { data } = await q;
        return Response.json(data ?? []);
      },
    },
  },
});
