import {
  getItem as getLocalItem,
  removeItem as removeLocalItem,
  setItem as setLocalItem,
} from './localStorageService'

const CART_DB_NAME = 'uaifood-cart-db'
const CART_DB_VERSION = 1
const CART_STORE = 'carts'

let dbPromise = null

function isIndexedDbAvailable() {
  return typeof indexedDB !== 'undefined'
}

function openCartDb() {
  if (!isIndexedDbAvailable()) return Promise.resolve(null)
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(CART_DB_NAME, CART_DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(CART_STORE)) {
        db.createObjectStore(CART_STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  }).catch(() => null)

  return dbPromise
}

async function withCartStore(mode, handler) {
  const db = await openCartDb()
  if (!db) return null
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CART_STORE, mode)
    const store = tx.objectStore(CART_STORE)
    handler(store, resolve, reject)
    tx.onerror = () => reject(tx.error)
  }).catch(() => null)
}

function getCartStorageKey(slug) {
  return `cart:${slug}`
}

export async function getCartSnapshot(slug) {
  const cartStorageKey = getCartStorageKey(slug)
  const legacy = getLocalItem(cartStorageKey, [])

  const fromDb = await withCartStore('readonly', (store, resolve, reject) => {
    const req = store.get(cartStorageKey)
    req.onsuccess = () => resolve(req.result?.payload || null)
    req.onerror = () => reject(req.error)
  })

  if (Array.isArray(fromDb)) return fromDb

  // Migração transparente do storage antigo para o IndexedDB.
  if (Array.isArray(legacy) && legacy.length > 0) {
    await setCartSnapshot(slug, legacy)
    return legacy
  }

  return Array.isArray(legacy) ? legacy : []
}

export async function setCartSnapshot(slug, snapshot) {
  const cartStorageKey = getCartStorageKey(slug)
  const payload = Array.isArray(snapshot) ? snapshot : []

  // Espelha no localStorage para compatibilidade com versões antigas/abas abertas.
  setLocalItem(cartStorageKey, payload)

  await withCartStore('readwrite', (store, resolve, reject) => {
    const req = store.put({
      id: cartStorageKey,
      payload,
      updatedAt: Date.now(),
    })
    req.onsuccess = () => resolve(true)
    req.onerror = () => reject(req.error)
  })
}

export async function clearCartSnapshot(slug) {
  const cartStorageKey = getCartStorageKey(slug)
  removeLocalItem(cartStorageKey)

  await withCartStore('readwrite', (store, resolve, reject) => {
    const req = store.delete(cartStorageKey)
    req.onsuccess = () => resolve(true)
    req.onerror = () => reject(req.error)
  })
}
