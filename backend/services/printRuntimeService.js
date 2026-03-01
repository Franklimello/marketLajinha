const STATUS_TTL_MS = 30 * 1000;

const storeStatusMap = new Map();

function normalizePrinters(printers) {
  if (!Array.isArray(printers)) return [];
  return printers.map((p) => ({
    id: String(p?.id || ''),
    sector: String(p?.sector || '').toLowerCase(),
    name: String(p?.name || ''),
    type: String(p?.type || 'ip').toLowerCase() === 'usb' ? 'usb' : 'ip',
    status: String(p?.status || '').toLowerCase() === 'online' ? 'online' : 'offline',
    lastSeenAt: p?.lastSeenAt ? new Date(p.lastSeenAt).toISOString() : new Date().toISOString(),
  }));
}

function upsertHeartbeat(storeId, printers = []) {
  const now = Date.now();
  storeStatusMap.set(String(storeId), {
    online: true,
    lastHeartbeatTs: now,
    printers: normalizePrinters(printers),
  });
}

function markOffline(storeId) {
  const current = storeStatusMap.get(String(storeId));
  storeStatusMap.set(String(storeId), {
    online: false,
    lastHeartbeatTs: current?.lastHeartbeatTs || Date.now(),
    printers: current?.printers || [],
  });
}

function getStatus(storeId) {
  const current = storeStatusMap.get(String(storeId));
  if (!current) return { online: false, printers: [], lastHeartbeatAt: null };
  const stale = (Date.now() - Number(current.lastHeartbeatTs || 0)) > STATUS_TTL_MS;
  return {
    online: current.online && !stale,
    lastHeartbeatAt: current.lastHeartbeatTs ? new Date(current.lastHeartbeatTs).toISOString() : null,
    printers: current.printers || [],
  };
}

module.exports = {
  upsertHeartbeat,
  markOffline,
  getStatus,
};

