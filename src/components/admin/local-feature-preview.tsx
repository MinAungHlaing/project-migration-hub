import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge, PageHeader, Panel, Stat, Table } from "@/components/admin/kit";
import {
  addLocalRepOrder,
  getLocalOrders,
  getLocalPreviewRows,
  resetLocalWorkspace,
  saveLocalPreviewRows,
  subscribeLocalWorkspace,
  updateLocalOrderStatus,
  type LocalWorkspaceOrder,
} from "@/lib/local-workspace";

type Preview = {
  title: string;
  description: string;
  columns: string[];
  rows: string[][];
  stats: [string, string, string][];
};

const previews: Record<string, Preview> = {
  overview: {
    title: "Admin overview",
    description: "A snapshot of catalog health, recent orders, and activity.",
    columns: ["Order", "Representative", "Outlet", "Total", "Status", "Created"],
    rows: [
      ["#1048", "Aung Min", "Shwe Market", "Ks 86,500", "New", "Today 08:42"],
      ["#1047", "Thiri Win", "City Mart", "Ks 124,000", "Fulfilled", "Today 07:55"],
      ["#1046", "Ko Zaw", "Golden Star Store", "Ks 54,000", "New", "Yesterday"],
    ],
    stats: [["Active products", "128", "Across 9 categories"], ["Ready to sell", "113", "15 out of stock"], ["Orders today", "8", "Ks 425,000 retail"]],
  },
  products: {
    title: "Products",
    description: "Change sample prices and stock status. These edits are saved in this browser.",
    columns: ["Product ID", "Product", "Category", "Retail", "Wholesale", "Status"],
    rows: [
      ["GTM - 0001", "Premium Green Tea", "Beverages", "Ks 12,500", "Ks 10,000", "In Stock"],
      ["GTM - 0002", "GTM Coffee Mix", "Beverages", "Ks 8,000", "Ks 6,500", "In Stock"],
      ["GTM - 0003", "Classic Crackers", "Snacks", "Ks 4,500", "Ks 3,600", "Out Of Stock"],
    ],
    stats: [["Products", "128", "Across 9 categories"], ["In stock", "113", "Ready to sell"], ["Out of stock", "15", "Need replenishment"]],
  },
  images: {
    title: "Media library",
    description: "Review product photography and identify catalog items that need images.",
    columns: ["Product", "Product ID", "Image", "Updated"],
    rows: [["Premium Green Tea", "GTM - 0001", "Image available", "Today"], ["GTM Coffee Mix", "GTM - 0002", "Image available", "Yesterday"], ["Classic Crackers", "GTM - 0003", "Missing image", "—"]],
    stats: [["With images", "116", "Catalog products"], ["Missing images", "12", "Need photos"], ["Coverage", "91%", "Image completeness"]],
  },
  upload: {
    title: "Catalog upload",
    description: "Try a local CSV import. It previews rows in the browser and does not upload files.",
    columns: ["Step", "What happens"],
    rows: [["1. Select file", "Choose a catalog spreadsheet"], ["2. Review changes", "Validate rows and inspect updates"], ["3. Apply import", "Update the catalog and review results"]],
    stats: [["Accepted formats", "CSV / XLSX", "Spreadsheet files"], ["Validation", "Preview first", "Review before applying"], ["Mode", "Local", "Changes stay in this browser"]],
  },
  orders: {
    title: "Orders",
    description: "Create a test order here or submit one from /rep, then change its status.",
    columns: ["#", "Date", "Representative", "Outlet", "Retail", "Wholesale", "Status"],
    rows: [],
    stats: [["Orders today", "8", "Across all reps"], ["New", "5", "Awaiting fulfillment"], ["Retail total", "Ks 425,000", "Today"]],
  },
  deliveries: {
    title: "Deliveries",
    description: "Review sample delivery assignments and change their workflow status.",
    columns: ["Order", "Outlet", "Delivery rep", "Order total", "Status"],
    rows: [["#1048", "Shwe Market", "Aung Min", "Ks 86,500", "Awaiting delivery"], ["#1045", "Ocean Store", "Thiri Win", "Ks 41,000", "Assigned"], ["Handover #18", "Aung Min", "Expected Ks 86,500", "Pending", "Needs verification"]],
    stats: [["Unassigned", "3", "Orders to assign"], ["In delivery", "5", "Assigned orders"], ["Handovers", "2", "Pending verification"]],
  },
  outlets: {
    title: "Outlets",
    description: "Manage sample outlet records in the local walkthrough.",
    columns: ["Outlet", "Area", "Aliases", "Orders", "Last visit"],
    rows: [["Shwe Market", "Sanchaung", "Shwe Mart", "14", "Today"], ["City Mart", "Downtown", "CityMart", "9", "Today"], ["Golden Star Store", "Kamayut", "Golden Star", "6", "Yesterday"]],
    stats: [["Outlets", "42", "Across 8 areas"], ["Orders this month", "186", "Matched to outlets"], ["Needs review", "3", "Potential duplicate names"]],
  },
  "sales-report": {
    title: "Sales report",
    description: "Compare sample sales activity across representatives.",
    columns: ["Representative", "Orders", "Retail", "Wholesale", "Average order"],
    rows: [["Aung Min", "24", "Ks 1,240,000", "Ks 980,000", "Ks 51,667"], ["Thiri Win", "19", "Ks 980,000", "Ks 770,000", "Ks 51,579"], ["Ko Zaw", "16", "Ks 745,000", "Ks 590,000", "Ks 46,563"]],
    stats: [["Retail sales", "Ks 2.96M", "Selected period"], ["Orders", "59", "Selected period"], ["Active reps", "8", "With sales"]],
  },
  inventory: {
    title: "Inventory",
    description: "Change on-hand sample quantities and inspect the resulting local stock view.",
    columns: ["Product", "Product ID", "On hand", "Unit", "Stock status"],
    rows: [["Premium Green Tea", "GTM - 0001", "86", "box", "In stock"], ["GTM Coffee Mix", "GTM - 0002", "34", "pack", "In stock"], ["Classic Crackers", "GTM - 0003", "0", "box", "Out of stock"]],
    stats: [["Tracked products", "128", "Inventory records"], ["Low stock", "7", "Review soon"], ["Out of stock", "15", "No available stock"]],
  },
  "stock-counts": {
    title: "Stock counts",
    description: "Move sample stock counts through their workflow statuses.",
    columns: ["Count", "Status", "Products counted", "Variance", "Created"],
    rows: [["November cycle count", "In progress", "42 / 128", "—", "Today"], ["October close", "Completed", "128 / 128", "−6 units", "Oct 31"], ["September close", "Completed", "128 / 128", "+2 units", "Sep 30"]],
    stats: [["Open counts", "1", "In progress"], ["Products counted", "42", "Current count"], ["Variances", "6", "Last completed count"]],
  },
  purchases: {
    title: "Purchasing",
    description: "Change sample purchase-order statuses to try the workflow.",
    columns: ["Purchase", "Supplier", "Status", "Items", "Total", "Updated"],
    rows: [["PO-0024", "GTM Foods", "Draft", "12", "Ks 840,000", "Today"], ["PO-0023", "Golden Beverage Co.", "Received", "8", "Ks 520,000", "Oct 30"], ["PO-0022", "GTM Foods", "Ordered", "5", "Ks 310,000", "Oct 28"]],
    stats: [["Draft", "1", "Needs review"], ["Ordered", "2", "Awaiting delivery"], ["Received this month", "8", "Purchase orders"]],
  },
  reps: {
    title: "Sales team",
    description: "Browse the demo representatives. Use aung/password or thiri/password at /rep.",
    columns: ["Code", "Name", "Status", "Mobile login", "Orders this month"],
    rows: [["REP-01", "Aung Min", "Active", "aung", "24"], ["REP-02", "Thiri Win", "Active", "thiri", "19"], ["REP-03", "Ko Zaw", "Active", "Not configured", "16"]],
    stats: [["Representatives", "3", "Demo accounts"], ["Active", "2", "Can sign in to /rep"], ["Mobile access", "2", "Local demo credentials"]],
  },
  expenses: {
    title: "Expenses",
    description: "Review sample operating expenses.",
    columns: ["Date", "Category", "Vendor", "Note", "Amount", "Status"],
    rows: [["Nov 1", "Fuel", "City Fuel", "Field rep route", "Ks 45,000", "Approved"], ["Oct 31", "Delivery", "Mawlamyine Express", "Hub transfer", "Ks 68,000", "Pending"], ["Oct 29", "Marketing", "Hlaing Wall Media", "Poster campaign", "Ks 125,000", "Approved"]],
    stats: [["Approved", "Ks 170,000", "This sample period"], ["Pending", "Ks 68,000", "Needs review"], ["Records", "3", "Sample expenses"]],
  },
  returns: {
    title: "Returns & damage",
    description: "Review sample returned, damaged, and expired goods.",
    columns: ["Product", "Outlet", "Qty", "Reason", "Value", "Owner", "Status"],
    rows: [["Classic Crackers", "Shwe Market", "3", "Damage in transit", "Ks 13,500", "Aye Aye", "Pending"], ["Dishwashing Liquid", "Myanmar Mart", "2", "Customer return", "Ks 11,000", "Hla Hla", "Approved"], ["GTM Coffee Mix", "Golden Star Store", "5", "Expiry check", "Ks 40,000", "Ko Zaw", "Rejected"]],
    stats: [["Records", "3", "Sample return records"], ["Pending", "1", "Needs finance review"], ["Total value", "Ks 64,500", "Recorded return value"]],
  },
  cashbox: {
    title: "Cashbox",
    description: "Compare cash movement with a sample denomination count.",
    columns: ["Denomination", "Count", "Counted value"],
    rows: [["Ks 1,000", "120", "Ks 120,000"], ["Ks 2,000", "64", "Ks 128,000"], ["Ks 5,000", "38", "Ks 190,000"], ["Ks 10,000", "26", "Ks 260,000"], ["Ks 20,000", "14", "Ks 280,000"], ["Ks 50,000", "6", "Ks 300,000"]],
    stats: [["Opening cash", "Ks 420,000", "Start of day"], ["Cash sales", "Ks 248,000", "Recorded"], ["Variance", "Ks 2,500", "Sample day close"]],
  },
};

function orderRows(orders: LocalWorkspaceOrder[]): string[][] {
  return orders.map((order) => [
    `#${order.id}`,
    new Date(order.created_at).toLocaleString(),
    order.rep_name,
    order.outlet_name,
    `Ks ${order.total_retail.toLocaleString()}`,
    "—",
    order.status,
  ]);
}

export function LocalFeaturePreview({ pathname }: { pathname: string }) {
  const section = pathname.replace(/^\/admin\/?/, "").split("/")[0] || "overview";
  const preview = previews[section];
  const [rows, setRows] = useState<string[][]>(() => preview ? getLocalPreviewRows(section, preview.rows) : []);
  const [orders, setOrders] = useState<LocalWorkspaceOrder[]>(() => getLocalOrders());
  const [outlet, setOutlet] = useState("");
  const [amount, setAmount] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setRows(preview ? getLocalPreviewRows(section, preview.rows) : []);
    setOrders(getLocalOrders());
  }, [section, preview]);

  useEffect(() => subscribeLocalWorkspace(() => {
    setRows(preview ? getLocalPreviewRows(section, preview.rows) : []);
    setOrders(getLocalOrders());
  }), [section, preview]);

  const visibleRows = useMemo(() => section === "orders" || section === "overview" ? orderRows(orders).slice(0, 30) : rows, [section, orders, rows]);

  if (!preview) {
    return (
      <>
        <PageHeader title="Admin feature preview" sub="Choose a section from the menu to explore the local sample screens." />
        <Panel title="Local workspace"><p className="text-sm text-muted-foreground">Data is stored in this browser only. No account or network is required.</p></Panel>
      </>
    );
  }

  function updateCell(rowIndex: number, cellIndex: number, value: string) {
    const updated = rows.map((row, index) => row.map((cell, column) => index === rowIndex && column === cellIndex ? value : cell));
    setRows(updated);
    saveLocalPreviewRows(section, updated);
    setNotice("Saved in this browser.");
  }

  function createOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const retail = Number(amount);
    if (!outlet.trim() || !Number.isFinite(retail) || retail <= 0) {
      setNotice("Enter an outlet and a total greater than zero.");
      return;
    }
    addLocalRepOrder({
      rep_name: "Local admin",
      outlet_name: outlet.trim(),
      total_retail: retail,
      status: "New",
      created_at: new Date().toISOString(),
    });
    setOutlet("");
    setAmount("");
    setNotice("Test order created and saved in this browser.");
  }

  return (
    <>
      <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
        Local test workspace — changes are saved in this browser only. They are not sent to any server.
      </div>
      <PageHeader title={preview.title} sub={preview.description} actions={<Button variant="outline" onClick={() => { resetLocalWorkspace(); setNotice("Local demo data reset."); }}>Reset local test data</Button>} />
      {section === "orders" && (
        <Panel title="Create a test order" className="mb-6">
          <form onSubmit={createOrder} className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
            <Input required maxLength={200} value={outlet} onChange={(event) => setOutlet(event.target.value)} placeholder="Outlet name" aria-label="Outlet name" />
            <Input required type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Order total (Ks)" aria-label="Order total" />
            <Button type="submit">Create test order</Button>
          </form>
        </Panel>
      )}
      {notice && <p role="status" className="mb-4 rounded-lg bg-accent p-3 text-sm text-accent-foreground">{notice}</p>}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {preview.stats.map(([label, value, hint]) => <Stat key={label} label={label} value={value} hint={hint} />)}
      </div>
      <Panel title={`Local ${preview.title.toLowerCase()}`}>
        <Table head={preview.columns}>
          {visibleRows.map((row, rowIndex) => (
            <tr key={`${section}-${rowIndex}-${row[0]}`}>
              {row.map((cell, cellIndex) => {
                const isStatus = /^(new|fulfilled|cancelled|in stock|out of stock|active|inactive|draft|received|ordered|in progress|completed|pending|approved|rejected|assigned|awaiting delivery|needs verification)$/i.test(cell);
                if (isStatus && (section === "orders" || section === "overview")) {
                  const id = Number((row[0] ?? "").replace("#", ""));
                  return <td key={cellIndex}><select aria-label={`Status for order ${id}`} value={cell} onChange={(event) => updateLocalOrderStatus(id, event.target.value)} className="rounded-md border bg-background px-2 py-1 text-xs"><option>New</option><option>Fulfilled</option><option>Cancelled</option></select></td>;
                }
                if (isStatus && cellIndex === row.length - 1) {
                  const options = section === "products" ? ["In Stock", "Out Of Stock"]
                    : section === "purchases" ? ["Draft", "Ordered", "Received", "Cancelled"]
                      : section === "stock-counts" ? ["In Progress", "Completed"]
                        : section === "returns" || section === "expenses" ? ["Pending", "Approved", "Rejected"]
                          : section === "deliveries" ? ["Awaiting delivery", "Assigned", "Delivered", "Failed"]
                            : ["Active", "Inactive"];
                  return <td key={cellIndex}><select aria-label={`${preview.title} row ${rowIndex + 1} status`} value={cell} onChange={(event) => updateCell(rowIndex, cellIndex, event.target.value)} className="rounded-md border bg-background px-2 py-1 text-xs">{options.map((option) => <option key={option}>{option}</option>)}</select></td>;
                }
                return <td key={cellIndex}>{isStatus ? <Badge>{cell}</Badge> : cell}</td>;
              })}
            </tr>
          ))}
        </Table>
        {!visibleRows.length && <p className="py-8 text-center text-sm text-muted-foreground">No orders yet. Create one here or submit from <Link to="/rep" className="text-primary underline">the rep app</Link>.</p>}
      </Panel>
      <p className="mt-4 text-xs text-muted-foreground">
        Your test data is kept in local browser storage and survives refreshes. <Link to="/rep" className="text-primary underline">Open the rep app</Link>
      </p>
    </>
  );
}
