import { createFileRoute } from "@tanstack/react-router";

// Public product photos, streamed from the private storage bucket.
export const Route = createFileRoute("/api/images/$name")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const name = params.name;
        if (!/^[\w.\- ]{1,120}$/.test(name) || name.includes("..")) return new Response("Not found", { status: 404 });
        const { adminClient } = await import("@/lib/server-clients");
        const db = await adminClient();
        const { data, error } = await db.storage.from("product-images").download(name);
        if (error || !data) return new Response("Not found", { status: 404 });
        return new Response(data, {
          headers: { "content-type": data.type || "image/webp", "cache-control": "public, max-age=86400" },
        });
      },
    },
  },
});
