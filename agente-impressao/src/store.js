const { app, safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(app.getPath('userData'), 'config.json');
const TOKEN_FILE = path.join(app.getPath('userData'), 'token.enc');
const PENDING_PRINT_JOBS_FILE = path.join(app.getPath('userData'), 'pending-print-jobs.json');
const PENDING_PRINT_JOB_TTL_MS = 24 * 60 * 60 * 1000;

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch {}
  return {};
}

function saveConfig(data) {
  const current = loadConfig();
  const merged = { ...current, ...data };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2));
  return merged;
}

function saveToken(token) {
  if (!token) {
    try { fs.unlinkSync(TOKEN_FILE); } catch {}
    return;
  }
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(token);
    fs.writeFileSync(TOKEN_FILE, encrypted);
  } else {
    fs.writeFileSync(TOKEN_FILE, Buffer.from(token, 'utf-8'));
  }
}

function loadToken() {
  try {
    if (!fs.existsSync(TOKEN_FILE)) return null;
    const data = fs.readFileSync(TOKEN_FILE);
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(data);
    }
    return data.toString('utf-8');
  } catch { return null; }
}

function normalizePendingPrintJobs(jobs) {
  const now = Date.now();
  let changed = false;
  const normalized = {};

  for (const [jobId, job] of Object.entries(jobs || {})) {
    const updatedAt = Date.parse(job?.updatedAt || job?.printedAt || '');
    if (Number.isFinite(updatedAt) && (now - updatedAt) > PENDING_PRINT_JOB_TTL_MS) {
      changed = true;
      continue;
    }

    normalized[String(jobId)] = {
      jobId: String(job?.jobId || jobId),
      pedidoId: String(job?.pedidoId || ''),
      setor: String(job?.setor || ''),
      printer: String(job?.printer || ''),
      printedAt: job?.printedAt || new Date().toISOString(),
      updatedAt: job?.updatedAt || new Date().toISOString(),
    };
  }

  return { normalized, changed };
}

function loadPendingPrintJobs() {
  try {
    if (!fs.existsSync(PENDING_PRINT_JOBS_FILE)) return {};
    const raw = JSON.parse(fs.readFileSync(PENDING_PRINT_JOBS_FILE, 'utf-8'));
    const { normalized, changed } = normalizePendingPrintJobs(raw);
    if (changed) savePendingPrintJobs(normalized);
    return normalized;
  } catch {
    return {};
  }
}

function savePendingPrintJobs(jobs) {
  const { normalized } = normalizePendingPrintJobs(jobs);
  fs.writeFileSync(PENDING_PRINT_JOBS_FILE, JSON.stringify(normalized, null, 2));
  return normalized;
}

function getPendingPrintJob(jobId) {
  const jobs = loadPendingPrintJobs();
  return jobs[String(jobId)] || null;
}

function upsertPendingPrintJob(job) {
  const jobs = loadPendingPrintJobs();
  const key = String(job?.jobId || '');
  if (!key) return null;

  jobs[key] = {
    ...(jobs[key] || {}),
    jobId: key,
    pedidoId: String(job?.pedidoId || jobs[key]?.pedidoId || ''),
    setor: String(job?.setor || jobs[key]?.setor || ''),
    printer: String(job?.printer || jobs[key]?.printer || ''),
    printedAt: job?.printedAt || jobs[key]?.printedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  savePendingPrintJobs(jobs);
  return jobs[key];
}

function removePendingPrintJob(jobId) {
  const jobs = loadPendingPrintJobs();
  const key = String(jobId || '');
  if (!jobs[key]) return false;
  delete jobs[key];
  savePendingPrintJobs(jobs);
  return true;
}

function clearAll() {
  try { fs.unlinkSync(CONFIG_FILE); } catch {}
  try { fs.unlinkSync(TOKEN_FILE); } catch {}
  try { fs.unlinkSync(PENDING_PRINT_JOBS_FILE); } catch {}
}

module.exports = {
  loadConfig,
  saveConfig,
  saveToken,
  loadToken,
  loadPendingPrintJobs,
  getPendingPrintJob,
  upsertPendingPrintJob,
  removePendingPrintJob,
  clearAll,
};
