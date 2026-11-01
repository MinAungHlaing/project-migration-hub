// Offline demo mode is opt-in only (VITE_LOCAL_DEMO=true) so the live preview always uses the real backend.
export const isLocalDemo = import.meta.env.DEV && import.meta.env["VITE_LOCAL_DEMO"] === "true";

export const localDemoCredentials = {
  email: "admin",
  password: "password",
};

export const localDemoRepAccounts = [
  { username: "aung", password: "password", rep: { id: 1, code: "REP-01", name: "Aung Min" } },
  { username: "thiri", password: "password", rep: { id: 2, code: "REP-02", name: "Thiri Win" } },
] as const;

export const localDemoCatalog = {
  items: [
    { id: 1, product_id: "GTM - 0001", product_name: "Premium Green Tea", upc: 883000000001, unit: "box", retail: 12500, wholesale: 10000, category: "Beverages", status: "In Stock", description: "Premium green tea for everyday refreshment.", has_image: false, image_path: null, generation: 1, updated_at: "2026-10-31T08:30:00.000Z" },
    { id: 2, product_id: "GTM - 0002", product_name: "GTM Coffee Mix", upc: 883000000002, unit: "pack", retail: 8000, wholesale: 6500, category: "Beverages", status: "In Stock", description: "A smooth instant coffee mix.", has_image: false, image_path: null, generation: 1, updated_at: "2026-10-30T07:15:00.000Z" },
    { id: 3, product_id: "GTM - 0003", product_name: "Classic Crackers", upc: 883000000003, unit: "box", retail: 4500, wholesale: 3600, category: "Snacks", status: "Out Of Stock", description: "Crisp crackers for sharing.", has_image: false, image_path: null, generation: 1, updated_at: "2026-10-29T15:00:00.000Z" },
    { id: 4, product_id: "GTM - 0004", product_name: "Crispy Potato Chips", upc: 883000000004, unit: "bag", retail: 2500, wholesale: 1900, category: "Snacks", status: "In Stock", description: "Light, savory potato chips.", has_image: false, image_path: null, generation: 1, updated_at: "2026-10-28T11:00:00.000Z" },
    { id: 5, product_id: "GTM - 0005", product_name: "Dishwashing Liquid", upc: 883000000005, unit: "bottle", retail: 5500, wholesale: 4400, category: "Household", status: "In Stock", description: "Everyday household dishwashing liquid.", has_image: false, image_path: null, generation: 1, updated_at: "2026-10-27T09:00:00.000Z" },
  ],
  reps: [
    { id: 1, code: "REP-01", name: "Aung Min" },
    { id: 2, code: "REP-02", name: "Thiri Win" },
  ],
};

const demoSessionKey = "gtm-local-demo-session";

export function hasLocalDemoSession(): boolean {
  return typeof window !== "undefined" && window.localStorage.getItem(demoSessionKey) === "active";
}

export function startLocalDemoSession(): void {
  window.localStorage.setItem(demoSessionKey, "active");
}

export function endLocalDemoSession(): void {
  window.localStorage.removeItem(demoSessionKey);
}

export const localDemoDashboard = {
  stats: {
    products: 128,
    categories: 9,
    instock: 113,
    outofstock: 15,
    missingImages: 12,
    ordersToday: 8,
    retailToday: 425000,
    pendingHandovers: 2,
  },
  recentOrders: [
    { id: 1048, rep_name: "Aung Min", outlet_name: "Shwe Market", total_retail: 86500, status: "New", created_at: "2026-11-01T08:42:00.000Z" },
    { id: 1047, rep_name: "Thiri Win", outlet_name: "City Mart (Sanchaung)", total_retail: 124000, status: "Confirmed", created_at: "2026-11-01T07:55:00.000Z" },
    { id: 1046, rep_name: "Ko Zaw", outlet_name: "Golden Star Store", total_retail: 54000, status: "Delivered", created_at: "2026-11-01T06:30:00.000Z" },
  ],
  activity: [
    { id: 3, product_id: "GTM - 0001", product_name: "Premium Green Tea", event_type: "back_in_stock", details: "Out Of Stock → In Stock", created_at: "2026-11-01T08:30:00.000Z" },
    { id: 2, product_id: "GTM - 0002", product_name: "GTM Coffee Mix", event_type: "price_changed", details: "Retail: 12,000 → 12,500 Ks", created_at: "2026-11-01T07:15:00.000Z" },
    { id: 1, product_id: "GTM - 0003", product_name: "Classic Crackers", event_type: "out_of_stock", details: "In Stock → Out Of Stock", created_at: "2026-10-31T15:00:00.000Z" },
  ],
  returns: [
    { id: 301, product_name: "Classic Crackers", outlet_name: "Shwe Market", quantity: 3, reason: "Damage in transit", value: 13500, owner: "Aye Aye", status: "Pending finance review", created_at: "2026-11-01T08:10:00.000Z" },
    { id: 302, product_name: "Dishwashing Liquid", outlet_name: "Myanmar Mart", quantity: 2, reason: "Customer return", value: 11000, owner: "Hla Hla", status: "Approved", created_at: "2026-10-31T16:20:00.000Z" },
    { id: 303, product_name: "GTM Coffee Mix", outlet_name: "Golden Star Store", quantity: 5, reason: "Expiry check", value: 40000, owner: "Ko Zaw", status: "Rejected", created_at: "2026-10-30T12:40:00.000Z" },
  ],
  expenses: [
    { id: 401, category: "Fuel", vendor: "City Fuel", amount: 45000, status: "Approved", date: "2026-11-01", note: "Field rep route" },
    { id: 402, category: "Delivery", vendor: "Mawlamyine Express", amount: 68000, status: "Pending", date: "2026-10-31", note: "Hub transfer" },
    { id: 403, category: "Marketing", vendor: "Hlaing Wall Media", amount: 125000, status: "Approved", date: "2026-10-29", note: "Poster campaign" },
  ],
  cashbox: {
    opening: 420000,
    cash_sales: 248000,
    card_sales: 185000,
    refunds: 12000,
    variance: 2500,
    closing: 820500,
    day_close_by: "Aung Min",
    note: "Small variance due to rounding on retail payments.",
    denominations: [
      { denomination: 1000, count: 120 },
      { denomination: 2000, count: 64 },
      { denomination: 5000, count: 38 },
      { denomination: 10000, count: 26 },
      { denomination: 20000, count: 14 },
      { denomination: 50000, count: 6 },
    ],
  },
};
