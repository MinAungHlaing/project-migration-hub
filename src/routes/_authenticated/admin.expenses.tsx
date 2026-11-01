import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { PageHeader, Panel, Stat, Table, Empty, Badge, useAction } from "@/components/admin/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isLocalDemo, localDemoDashboard } from "@/lib/local-demo";
import { listExpenses, addExpense, setExpenseStatus } from "@/lib/finance.functions";
import { ks } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/expenses")({
  head: () => ({ meta: [{ title: "Expenses — GTM Admin" }] }),
  component: ExpensesPage,
});

type Row = { id: number; expense_date: string; category: string; vendor: string; note: string; amount: number; status: string };

function ExpensesPage() {
  const list = useServerFn(listExpenses);
  const add = useServerFn(addExpense);
  const setStatus = useServerFn(setExpenseStatus);
  const { data: live = [] } = useQuery({ queryKey: ["expenses"], queryFn: () => list(), enabled: !isLocalDemo });
  const data: Row[] = isLocalDemo ? localDemoDashboard.expenses.map((e) => ({ ...e, expense_date: e.date })) : (live as Row[]);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ expense_date: today, category: "", vendor: "", note: "", amount: "" });
  const save = useAction((f: typeof form) => add({ data: { ...f, amount: Number(f.amount) } }), {
    success: "Expense recorded", invalidate: [["expenses"]], onDone: () => setForm({ expense_date: today, category: "", vendor: "", note: "", amount: "" }),
  });
  const change = useAction((v: { id: number; status: string }) => setStatus({ data: v }), { invalidate: [["expenses"]] });
  const sum = (s?: string) => data.filter((e) => !s || e.status === s).reduce((t, e) => t + Number(e.amount), 0);

  return (
    <>
      <PageHeader title="Expenses" sub="Daily operating costs, delivery, fuel, and campaign spend." />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Approved" value={ks(sum("Approved"))} />
        <Stat label="Pending" value={ks(sum("Pending"))} />
        <Stat label="Records" value={data.length} />
        <Stat label="Total" value={ks(sum())} />
      </div>
      {!isLocalDemo && (
        <Panel title="Record an expense" className="mb-6">
          <form className="grid gap-3 md:grid-cols-6" onSubmit={(e) => { e.preventDefault(); save.mutate(form); }}>
            <Input type="date" aria-label="Date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
            <Input placeholder="Category (Fuel…)" aria-label="Category" required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <Input placeholder="Vendor" aria-label="Vendor" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
            <Input placeholder="Note" aria-label="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            <Input type="number" min="0" placeholder="Amount (Ks)" aria-label="Amount" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <Button type="submit" disabled={save.isPending}>Add</Button>
          </form>
        </Panel>
      )}
      <Panel>
        {data.length ? (
          <Table head={["Date", "Category", "Vendor", "Note", "Amount", "Status"]}>
            {data.map((item) => (
              <tr key={item.id}>
                <td>{item.expense_date}</td>
                <td>{item.category}</td>
                <td>{item.vendor}</td>
                <td className="text-muted-foreground">{item.note}</td>
                <td>{ks(item.amount)}</td>
                <td>
                  {isLocalDemo ? <Badge>{item.status}</Badge> : (
                    <select aria-label={`Status for expense ${item.id}`} value={item.status} onChange={(e) => change.mutate({ id: item.id, status: e.target.value })} className="rounded-md border bg-background px-2 py-1 text-xs">
                      <option>Pending</option><option>Approved</option><option>Rejected</option>
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        ) : <Empty>No expenses recorded yet.</Empty>}
      </Panel>
    </>
  );
}
