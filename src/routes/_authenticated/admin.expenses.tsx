import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Stat, Table, Empty } from "@/components/admin/kit";
import { isLocalDemo, localDemoDashboard } from "@/lib/local-demo";
import { ks } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/expenses")({
  component: ExpensesPage,
});

function ExpensesPage() {
  const data = isLocalDemo ? localDemoDashboard.expenses : [];
  const total = (data ?? []).reduce((sum, item) => sum + Number(item.amount), 0);
  return (
    <>
      <PageHeader title="Expenses" sub="Daily operating costs, delivery, fuel, and campaign spend." />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Approved" value={ks((data ?? []).filter((e) => e.status === "Approved").reduce((sum, e) => sum + Number(e.amount), 0))} />
        <Stat label="Pending" value={ks((data ?? []).filter((e) => e.status === "Pending").reduce((sum, e) => sum + Number(e.amount), 0))} />
        <Stat label="Records" value={(data ?? []).length} />
        <Stat label="Total" value={ks(total)} />
      </div>
      <Panel>
        {(data ?? []).length ? (
          <Table head={["Date", "Category", "Vendor", "Note", "Amount", "Status"]}>
            {(data ?? []).map((item) => (
              <tr key={item.id}>
                <td>{item.date}</td>
                <td>{item.category}</td>
                <td>{item.vendor}</td>
                <td>{item.note}</td>
                <td>{ks(item.amount)}</td>
                <td><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${item.status === "Approved" ? "bg-accent text-accent-foreground" : "bg-warning/15 text-foreground"}`}>{item.status}</span></td>
              </tr>
            ))}
          </Table>
        ) : <Empty>No expense records yet.</Empty>}
      </Panel>
    </>
  );
}
