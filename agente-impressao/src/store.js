const { app, safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(app.getPath('userData'), 'config.json');
const TOKEN_FILE = path.join(app.getPath('userData'), 'token.enc');

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

function clearAll() {
  try { fs.unlinkSync(CONFIG_FILE); } catch {}
  try { fs.unlinkSync(TOKEN_FILE); } catch {}
}

module.exports = { loadConfig, saveConfig, saveToken, loadToken, clearAll };
