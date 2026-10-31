import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/mobile/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const m = await import("@/lib/mobile-api.server");
        return m.login(await m.readJson(request));
      },
    },
  },
});
