require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const zlib = require('zlib');

const DATABASE_URL = process.env.DATABASE_URL || '';
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups');
const BACKUP_RETENTION_DAYS = Number(process.env.BACKUP_RETENTION_DAYS || 30);
const BACKUP_PREFIX = process.env.BACKUP_FILENAME_PREFIX || 'db-backup';

function timestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return [
    now.getUTCFullYear(),
    pad(now.getUTCMonth() + 1),
    pad(now.getUTCDate()),
    '-',
    pad(now.getUTCHours()),
    pad(now.getUTCMinutes()),
    pad(now.getUTCSeconds()),
    'Z',
  ].join('');
}

function runBackup(outputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '--dbname',
      DATABASE_URL,
      '--clean',
      '--if-exists',
      '--no-owner',
      '--no-privileges',
      '--format=plain',
      '--encoding=UTF8',
    ];

    const child = spawn('pg_dump', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });

    const gzip = zlib.createGzip({ level: 9 });
    const out = fs.createWriteStream(outputPath);
    let stderr = '';

    child.stdout.pipe(gzip).pipe(out);
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk || '');
    });

    child.on('error', (err) => {
      if (err.code === 'ENOENT') {
        reject(new Error('pg_dump não encontrado no ambiente. Instale o cliente PostgreSQL para habilitar backup.'));
        return;
      }
      reject(err);
    });

    out.on('error', reject);

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`pg_dump falhou com código ${code}. ${stderr.trim()}`));
        return;
      }
      resolve();
    });
  });
}

function cleanupOldBackups(dir, retentionDays) {
  if (!Number.isFinite(retentionDays) || retentionDays <= 0) return;
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (!file.startsWith(`${BACKUP_PREFIX}-`) || !file.endsWith('.sql.gz')) continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.mtimeMs < cutoff) {
      fs.unlinkSync(fullPath);
    }
  }
}

async function main() {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL não definido.');
  }

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const fileName = `${BACKUP_PREFIX}-${timestamp()}.sql.gz`;
  const outputPath = path.join(BACKUP_DIR, fileName);

  await runBackup(outputPath);
  cleanupOldBackups(BACKUP_DIR, BACKUP_RETENTION_DAYS);

  const stat = fs.statSync(outputPath);
  console.log(`[Backup] OK: ${outputPath} (${Math.round(stat.size / 1024)} KB)`);
}

main().catch((err) => {
  console.error(`[Backup] Erro: ${err.message}`);
  process.exit(1);
});
