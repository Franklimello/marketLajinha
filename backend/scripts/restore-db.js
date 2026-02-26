require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const zlib = require('zlib');

const DATABASE_URL = process.env.DATABASE_URL || '';
const IS_PROD = process.env.NODE_ENV === 'production';
const ALLOW_PROD_RESTORE = process.env.ALLOW_PROD_RESTORE === 'true';

function resolveInputFile(argPath) {
  if (!argPath) return null;
  if (path.isAbsolute(argPath)) return argPath;
  return path.resolve(process.cwd(), argPath);
}

function runRestore(inputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '--dbname',
      DATABASE_URL,
      '-v',
      'ON_ERROR_STOP=1',
      '-1',
    ];

    const child = spawn('psql', args, {
      stdio: ['pipe', 'inherit', 'pipe'],
      env: process.env,
    });

    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk || '');
    });

    child.on('error', (err) => {
      if (err.code === 'ENOENT') {
        reject(new Error('psql não encontrado no ambiente. Instale o cliente PostgreSQL para habilitar restore.'));
        return;
      }
      reject(err);
    });

    const fileStream = fs.createReadStream(inputPath);
    const inputStream = inputPath.endsWith('.gz')
      ? fileStream.pipe(zlib.createGunzip())
      : fileStream;

    inputStream.on('error', reject);
    inputStream.pipe(child.stdin);

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Restore falhou com código ${code}. ${stderr.trim()}`));
        return;
      }
      resolve();
    });
  });
}

async function main() {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL não definido.');
  }
  if (IS_PROD && !ALLOW_PROD_RESTORE) {
    throw new Error('Restore em produção bloqueado. Defina ALLOW_PROD_RESTORE=true para confirmar a execução.');
  }

  const inputPath = resolveInputFile(process.argv[2]);
  if (!inputPath) {
    throw new Error('Informe o arquivo de backup. Exemplo: npm run restore:db -- ./backups/db-backup-20260226-030000Z.sql.gz');
  }
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Arquivo não encontrado: ${inputPath}`);
  }

  console.log(`[Restore] Iniciando restore de ${inputPath}...`);
  await runRestore(inputPath);
  console.log('[Restore] Concluído com sucesso.');
}

main().catch((err) => {
  console.error(`[Restore] Erro: ${err.message}`);
  process.exit(1);
});
