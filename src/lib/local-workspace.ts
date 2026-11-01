import { localDemoDashboard } from "@/lib/local-demo";

export type LocalWorkspaceOrder = {
  id: number;
  rep_name: string;
  outlet_name: string;
  total_retail: number;
  status: string;
  created_at: string;
};

const STORAGE_KEY = "gtm-local-workspace";
const CHANGE_EVENT = "gtm-local-workspace-change";

type WorkspaceState = {
  orders: LocalWorkspaceOrder[];
  previewRows: Record<string, string[][]>;
  nextOrderId: number;
};

function initialState(): WorkspaceState {
  const orders = localDemoDashboard.recentOrders.map((order) => ({ ...order }));
  return {
    orders,
    previewRows: {},
    nextOrderId: Math.max(...orders.map((order) => order.id), 1048) + 1,
  };
}

function readState(): WorkspaceState {
  const fallback = initialState();
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<WorkspaceState>;
    return {
      orders: Array.isArray(parsed.orders) ? parsed.orders : fallback.orders,
      previewRows: parsed.previewRows && typeof parsed.previewRows === "object" ? parsed.previewRows : {},
      nextOrderId: Number.isInteger(parsed.nextOrderId) ? parsed.nextOrderId! : fallback.nextOrderId,
    };
  } catch (cause) {
    console.error("Could not read local demo data.", cause);
    return fallback;
  }
}

function writeState(state: WorkspaceState): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function getLocalOrders(): LocalWorkspaceOrder[] {
  return readState().orders.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function addLocalRepOrder(order: Omit<LocalWorkspaceOrder, "id">): number {
  const state = readState();
  const id = state.nextOrderId;
  state.orders.unshift({ ...order, id });
  state.nextOrderId += 1;
  writeState(state);
  return id;
}

export function updateLocalOrderStatus(id: number, status: string): void {
  const state = readState();
  state.orders = state.orders.map((order) => order.id === id ? { ...order, status } : order);
  writeState(state);
}

export function getLocalPreviewRows(section: string, fallback: string[][]): string[][] {
  const stored = readState().previewRows[section];
  return stored ? stored.map((row) => [...row]) : fallback.map((row) => [...row]);
}

export function saveLocalPreviewRows(section: string, rows: string[][]): void {
  const state = readState();
  state.previewRows[section] = rows.map((row) => [...row]);
  writeState(state);
}

export function subscribeLocalWorkspace(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function resetLocalWorkspace(): void {
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
