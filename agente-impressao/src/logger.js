const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(app.getPath('userData'), 'logs');
const MAX_MEMORY_LOGS = 200;

if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const memoryLogs = [];

function timestamp() {
  return new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function writeFile(filename, line) {
  try {
    const filepath = path.join(LOG_DIR, filename);
    const stat = fs.existsSync(filepath) ? fs.statSync(filepath) : null;
    if (stat && stat.size > 2 * 1024 * 1024) {
      fs.renameSync(filepath, filepath.replace('.log', `.${Date.now()}.log`));
    }
    fs.appendFileSync(filepath, line + '\n');
  } catch {}
}

function log(tipo, msg) {
  const ts = timestamp();
  const entry = { tipo, msg, hora: ts };
  memoryLogs.unshift(entry);
  if (memoryLogs.length > MAX_MEMORY_LOGS) memoryLogs.length = MAX_MEMORY_LOGS;

  const line = `[${ts}] [${tipo.toUpperCase()}] ${msg}`;
  writeFile('activity.log', line);
  if (tipo === 'erro') writeFile('error.log', line);
}

function info(msg) { log('info', msg); }
function ok(msg) { log('ok', msg); }
function erro(msg) { log('erro', msg); }
function getLogs() { return [...memoryLogs]; }

module.exports = { info, ok, erro, getLogs, LOG_DIR };
