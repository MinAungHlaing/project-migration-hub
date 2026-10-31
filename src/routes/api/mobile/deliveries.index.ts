import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/mobile/deliveries/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const m = await import("@/lib/mobile-api.server");
        const rep = await m.getMobileRep(request);
        if (!rep) return m.json({ error: "Authentication required." }, 401);
        return m.deliveries(rep, new URL(request.url));
      },
    },
  },
});
