import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Download, Image as ImageIcon } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listProductsAdmin, getPriceHistoryAll } from "@/lib/admin.functions";
import { PageHeader, Panel, Badge, Table, Empty } from "@/components/admin/kit";
import { ks } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/products/")({ component: Products });

function Products() {
  const { data = [] } = useQuery({ queryKey: ["admin-products"], queryFn: () => listProductsAdmin() });
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const list = useMemo(() => data.filter((p) => (status === "ALL" || p.status === status) &&
    `${p.product_id} ${p.product_name} ${p.category} ${p.supplier}`.toLowerCase().includes(q.toLowerCase())), [data, q, status]);

  function exportPrices() {
    const rows = data.map((p) => ({ "Product ID": p.product_id, "Product Name": p.product_name, UPC: p.upc, Unit: p.unit, Retail: Number(p.retail), Wholesale: Number(p.wholesale), Category: p.category, Status: p.status, "Base Price": p.base_price, B2C: p.b2c, Supplier: p.supplier, Description: p.description }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Product Catalog");
    XLSX.writeFile(wb, "prices.xlsx");
  }
  async function exportHistory() {
    const h = await getPriceHistoryAll();
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(h.map((r) => ({ "Product ID": r.product_id, "Product Name": r.product_name, "Old Retail": r.old_retail, "New Retail": r.new_retail, "Old Wholesale": r.old_wholesale, "New Wholesale": r.new_wholesale, Source: r.source, "Changed At": r.changed_at }))), "Price History");
    XLSX.writeFile(wb, "price-history.xlsx");
  }

  return (
    <>
      <PageHeader title="Products" sub={`${data.length} products in the catalog`}
        actions={<>
          <Button variant="outline" onClick={exportPrices}><Download className="size-4" />Prices .xlsx</Button>
          <Button variant="outline" onClick={exportHistory}><Download className="size-4" />Price history .xlsx</Button>
          <Button asChild><Link to="/admin/products/new"><Plus className="size-4" />Add product</Link></Button>
        </>} />
      <Panel>
        <div className="mb-4 flex flex-wrap gap-2">
          <Input placeholder="Search ID, name, category, supplier…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
          {["ALL", "In Stock", "Out Of Stock"].map((s) => (
            <Button key={s} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)}>{s === "ALL" ? "All" : s}</Button>
          ))}
        </div>
        {list.length ? (
          <Table head={["ID", "Name", "Category", "Unit", "Retail", "Wholesale", "Base", "Status", ""]}>
            {list.map((p) => (
              <tr key={p.id}>
                <td className="font-mono text-xs">{p.product_id}</td>
                <td className="font-medium"><Link to="/admin/products/$id" params={{ id: String(p.id) }} className="hover:text-primary">{p.product_name}</Link></td>
                <td>{p.category}</td><td>{p.unit}</td><td>{ks(p.retail)}</td><td>{ks(p.wholesale)}</td>
                <td className="text-muted-foreground">{p.base_price != null ? ks(p.base_price) : "—"}</td>
                <td><Badge>{p.status}</Badge></td>
                <td>{p.has_image && <ImageIcon className="size-4 text-primary" />}</td>
              </tr>
            ))}
          </Table>
        ) : <Empty>No products match.</Empty>}
      </Panel>
    </>
  );
}
