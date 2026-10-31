import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/mobile/deliveries/sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const m = await import("@/lib/mobile-api.server");
        const rep = await m.getMobileRep(request);
        if (!rep) return m.json({ error: "Authentication required." }, 401);
        return m.syncDeliveries(rep, await m.readJson(request));
      },
    },
  },
});
