require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups');
const BACKUP_PREFIX = process.env.BACKUP_FILENAME_PREFIX || 'db-backup';
const S3_BACKUP_BUCKET = process.env.S3_BACKUP_BUCKET || '';
const S3_BACKUP_REGION = process.env.S3_BACKUP_REGION || '';
const S3_BACKUP_PREFIX = String(process.env.S3_BACKUP_PREFIX || 'database').replace(/^\/+|\/+$/g, '');
const S3_BACKUP_STORAGE_CLASS = process.env.S3_BACKUP_STORAGE_CLASS || 'STANDARD_IA';
const S3_BACKUP_SSE = process.env.S3_BACKUP_SSE || '';
const S3_BACKUP_SSE_KMS_KEY_ID = process.env.S3_BACKUP_SSE_KMS_KEY_ID || '';

function runLocalBackup() {
  return new Promise((resolve, reject) => {
    const backupScript = path.join(__dirname, 'backup-db.js');
    const child = spawn(process.execPath, [backupScript], {
      stdio: 'inherit',
      env: process.env,
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Backup local falhou com código ${code}.`));
        return;
      }
      resolve();
    });
  });
}

function getLatestBackupFile() {
  const files = fs.readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith(`${BACKUP_PREFIX}-`) && f.endsWith('.sql.gz'))
    .map((f) => ({ name: f, fullPath: path.join(BACKUP_DIR, f), mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return files[0] || null;
}

function buildS3Key(fileName) {
  const date = new Date();
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const base = S3_BACKUP_PREFIX ? `${S3_BACKUP_PREFIX}/${yyyy}/${mm}/${dd}` : `${yyyy}/${mm}/${dd}`;
  return `${base}/${fileName}`;
}

async function uploadToS3(fileInfo) {
  const client = new S3Client({ region: S3_BACKUP_REGION });
  const key = buildS3Key(fileInfo.name);

  const command = new PutObjectCommand({
    Bucket: S3_BACKUP_BUCKET,
    Key: key,
    Body: fs.createReadStream(fileInfo.fullPath),
    ContentType: 'application/gzip',
    StorageClass: S3_BACKUP_STORAGE_CLASS,
    Metadata: {
      source: 'marketlajinha-backend',
      type: 'postgres-backup',
    },
    ...(S3_BACKUP_SSE ? { ServerSideEncryption: S3_BACKUP_SSE } : {}),
    ...(S3_BACKUP_SSE_KMS_KEY_ID ? { SSEKMSKeyId: S3_BACKUP_SSE_KMS_KEY_ID } : {}),
  });

  await client.send(command);
  return key;
}

async function main() {
  if (!S3_BACKUP_BUCKET || !S3_BACKUP_REGION) {
    throw new Error('Defina S3_BACKUP_BUCKET e S3_BACKUP_REGION para enviar backup ao S3.');
  }

  await runLocalBackup();
  const latest = getLatestBackupFile();
  if (!latest) {
    throw new Error('Nenhum arquivo de backup encontrado para upload.');
  }

  const key = await uploadToS3(latest);
  console.log(`[Backup S3] OK: s3://${S3_BACKUP_BUCKET}/${key}`);
}

main().catch((err) => {
  console.error(`[Backup S3] Erro: ${err.message}`);
  process.exit(1);
});
