import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/activity")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { publicClient } = await import("@/lib/server-clients");
        const u = new URL(request.url);
        const limit = Math.max(1, Math.min(Number(u.searchParams.get("limit")) || 30, 100));
        const before = Number(u.searchParams.get("before_id")) || null;
        const db = publicClient();
        let q = db.from("activity_log").select("id, event_type, product_id, product_name, details, created_at").order("id", { ascending: false }).limit(limit);
        if (before) q = q.lt("id", before);
        const [{ data: events }, { data: latest }] = await Promise.all([q, db.from("activity_log").select("id").order("id", { ascending: false }).limit(1)]);
        return Response.json({ latest_id: latest?.[0]?.id ?? 0, events: events ?? [], has_more: (events ?? []).length === limit });
      },
    },
  },
});
