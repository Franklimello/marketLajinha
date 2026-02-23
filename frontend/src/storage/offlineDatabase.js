const DB_NAME = 'uaifood-offline-db';
const DB_VERSION = 1;
const STORES = {
  produtosCidade: 'produtosCidade',
  lojasCidade: 'lojasCidade',
  pedidosHistorico: 'pedidosHistorico',
  pedidosPendentes: 'pedidosPendentes',
};

let dbPromise = null;

function openDatabase() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      Object.values(STORES).forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id' });
        }
      });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function withStore(storeName, mode, fn) {
  try {
    const db = await openDatabase();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const out = fn(store, resolve, reject);
      tx.oncomplete = () => {
        if (out === undefined) resolve(undefined);
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    return null;
  }
}

export function makeCityKey(prefix, cidade = 'all') {
  return `${prefix}:${String(cidade || 'all').toLowerCase()}`;
}

export async function setCache(storeName, id, payload) {
  return withStore(storeName, 'readwrite', (store, resolve, reject) => {
    const req = store.put({ id, payload, updatedAt: Date.now() });
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

export async function getCache(storeName, id, maxAgeMs = 1000 * 60 * 15) {
  return withStore(storeName, 'readonly', (store, resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => {
      const data = req.result;
      if (!data) return resolve(null);
      if (Date.now() - Number(data.updatedAt || 0) > maxAgeMs) return resolve(null);
      resolve(data.payload || null);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function addLocalOrderHistory(order) {
  const id = `hist:${order?.id || Date.now()}`;
  return setCache(STORES.pedidosHistorico, id, order);
}

export async function enqueuePendingOrder(orderDraft) {
  const id = `pending:${Date.now()}:${Math.random().toString(16).slice(2, 8)}`;
  return setCache(STORES.pedidosPendentes, id, orderDraft);
}

async function listByStore(storeName) {
  return withStore(storeName, 'readonly', (store, resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  }) || [];
}

async function removeById(storeName, id) {
  return withStore(storeName, 'readwrite', (store, resolve, reject) => {
    const req = store.delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

export async function syncPendingOrders(sendOrderFn) {
  if (typeof sendOrderFn !== 'function') return;
  if (!navigator.onLine) return;
  const pendentes = await listByStore(STORES.pedidosPendentes);
  for (const item of pendentes) {
    try {
      await sendOrderFn(item.payload);
      await removeById(STORES.pedidosPendentes, item.id);
    } catch {
      // mantem na fila para tentar de novo
    }
  }
}

export function setupAutoSync(sendOrderFn) {
  const handler = () => syncPendingOrders(sendOrderFn);
  window.addEventListener('online', handler);
  return () => window.removeEventListener('online', handler);
}

export const OFFLINE_STORES = STORES;
