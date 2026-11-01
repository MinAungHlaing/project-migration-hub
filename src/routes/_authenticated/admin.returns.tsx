import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Stat, Table, Empty } from "@/components/admin/kit";
import { isLocalDemo, localDemoDashboard } from "@/lib/local-demo";
import { ks } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/returns")({
  component: ReturnsPage,
});

function ReturnsPage() {
  const data = isLocalDemo ? localDemoDashboard.returns : [];
  const totalValue = (data ?? []).reduce((sum, item) => sum + Number(item.value), 0);
  return (
    <>
      <PageHeader title="Returns & damage" sub="Stock returns, damaged goods, and customer rejections." />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Records" value={(data ?? []).length} />
        <Stat label="Total value" value={ks(totalValue)} />
        <Stat label="Pending" value={(data ?? []).filter((item) => item.status === "Pending finance review").length} />
        <Stat label="Approved" value={(data ?? []).filter((item) => item.status === "Approved").length} />
      </div>
      <Panel>
        {(data ?? []).length ? (
          <Table head={["ID", "Product", "Outlet", "Qty", "Reason", "Value", "Owner", "Status"]}>
            {(data ?? []).map((item) => (
              <tr key={item.id}>
                <td>#{item.id}</td>
                <td>{item.product_name}</td>
                <td>{item.outlet_name}</td>
                <td>{item.quantity}</td>
                <td>{item.reason}</td>
                <td>{ks(item.value)}</td>
                <td>{item.owner}</td>
                <td><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${item.status === "Approved" ? "bg-accent text-accent-foreground" : item.status === "Rejected" ? "bg-destructive/10 text-destructive" : "bg-warning/15 text-foreground"}`}>{item.status}</span></td>
              </tr>
            ))}
          </Table>
        ) : <Empty>No returns or damage records.</Empty>}
      </Panel>
    </>
  );
}
