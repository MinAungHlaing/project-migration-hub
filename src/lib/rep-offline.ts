export type RepIdentity = { id: number; code: string; name: string };

export type RepProduct = {
  id: number;
  product_id: string;
  product_name: string;
  upc: number;
  unit: string;
  retail: number;
  wholesale: number;
  category: string;
  status: string;
  description: string;
};

export type RepOutlet = { id: number; name: string; area: string };

export type RepCatalogSnapshot = {
  snapshot_id: string;
  products: RepProduct[];
  outlets: RepOutlet[];
};

export type RepOrderLine = { product_pk: number; quantity: number };

export type QueuedRepOrder = {
  client_order_id: string;
  rep_id: number;
  catalog_snapshot_id: string;
  outlet_name: string;
  outlet_id: number | null;
  collected_at: string;
  items: RepOrderLine[];
  total_retail: number;
  state: "queued" | "syncing" | "synced" | "needs-attention";
  server_order_id?: number;
  sync_error?: string;
  price_mismatch?: boolean;
};

const DB_NAME = "gtm-rep-offline";
const DB_VERSION = 1;
const CATALOG_STORE = "catalog";
const ORDER_STORE = "orders";

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("This browser does not support offline storage."));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(CATALOG_STORE)) {
        database.createObjectStore(CATALOG_STORE, { keyPath: "key" });
      }
      if (!database.objectStoreNames.contains(ORDER_STORE)) {
        database.createObjectStore(ORDER_STORE, { keyPath: "client_order_id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open offline storage."));
  });
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | undefined> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const request = action(transaction.objectStore(storeName));
    let result: T | undefined;
    let settled = false;
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      database.close();
      reject(error);
    };
    request.onsuccess = () => { result = request.result; };
    request.onerror = () => fail(request.error ?? new Error("Offline storage operation failed."));
    transaction.onabort = () => fail(transaction.error ?? new Error("Offline storage transaction was aborted."));
    transaction.onerror = () => fail(transaction.error ?? new Error("Offline storage transaction failed."));
    transaction.oncomplete = () => {
      database.close();
      if (!settled) {
        settled = true;
        resolve(result);
      }
    };
  });
}

export async function readCachedCatalog(): Promise<RepCatalogSnapshot | null> {
  const row = await withStore<{ key: string; value: RepCatalogSnapshot } | undefined>(
    CATALOG_STORE,
    "readonly",
    (store) => store.get("current"),
  );
  return row?.value ?? null;
}

export async function saveCachedCatalog(snapshot: RepCatalogSnapshot): Promise<void> {
  await withStore(CATALOG_STORE, "readwrite", (store) => store.put({ key: "current", value: snapshot }));
}

export async function readQueuedOrders(): Promise<QueuedRepOrder[]> {
  const orders = await withStore<QueuedRepOrder[]>(ORDER_STORE, "readonly", (store) => store.getAll()) ?? [];
  return orders.sort((a, b) => b.collected_at.localeCompare(a.collected_at));
}

export async function saveQueuedOrder(order: QueuedRepOrder): Promise<void> {
  await withStore(ORDER_STORE, "readwrite", (store) => store.put(order));
}

export async function saveQueuedOrders(orders: QueuedRepOrder[]): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(ORDER_STORE, "readwrite");
    const store = transaction.objectStore(ORDER_STORE);
    for (const order of orders) store.put(order);
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => { database.close(); reject(transaction.error ?? new Error("Could not update queued orders.")); };
    transaction.onabort = () => { database.close(); reject(transaction.error ?? new Error("Queued order update was aborted.")); };
  });
}

export function readRepSession(): { token: string; rep: RepIdentity } | null {
  try {
    const token = localStorage.getItem("gtm-rep-token");
    const repJson = localStorage.getItem("gtm-rep-identity");
    if (!token || !repJson) return null;
    const rep = JSON.parse(repJson) as RepIdentity;
    if (!Number.isInteger(rep.id) || !rep.code || !rep.name) return null;
    return { token, rep };
  } catch {
    return null;
  }
}

export function saveRepSession(token: string, rep: RepIdentity): void {
  localStorage.setItem("gtm-rep-token", token);
  localStorage.setItem("gtm-rep-identity", JSON.stringify(rep));
}

export function clearRepSession(): void {
  localStorage.removeItem("gtm-rep-token");
  localStorage.removeItem("gtm-rep-identity");
}
