import { createFileRoute } from "@tanstack/react-router";

// Public price list in the original field names, kept for Excel "Get Data from Web" / Power Query.
export const Route = createFileRoute("/api/prices")({
  server: {
    handlers: {
      GET: async () => {
        const { publicClient } = await import("@/lib/server-clients");
        const { data } = await publicClient().from("products")
          .select("id, product_id, product_name, upc, unit, retail, wholesale, category, status, description, has_image").order("id").range(0, 9999);
        const rows = (data ?? []).map((r) => ({
          id: r.id, "Product ID": r.product_id, "Product Name": r.product_name, UPC: r.upc, Unit: r.unit,
          Retail: Number(r.retail), Wholesale: Number(r.wholesale), Category: r.category, Status: r.status,
          Description: r.description, has_image: r.has_image,
        }));
        return Response.json(rows);
      },
    },
  },
});
