/**
 * Configuração do Firebase Admin SDK para validação de JWT.
 *
 * Aceita 3 formas de configurar:
 *   1. FIREBASE_SERVICE_ACCOUNT (JSON inline na env)
 *   2. GOOGLE_APPLICATION_CREDENTIALS (caminho do arquivo JSON)
 *   3. Arquivo serviceAccountKey.json na raiz do backend
 */
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let firebaseInitialized = false;

function tryInit() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(sa) });
    return true;
  }

  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    || path.join(__dirname, '..', 'serviceAccountKey.json');

  if (fs.existsSync(keyPath)) {
    const sa = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
    admin.initializeApp({ credential: admin.credential.cert(sa) });
    return true;
  }

  return false;
}

try {
  firebaseInitialized = tryInit();
  if (firebaseInitialized) {
    console.log('Firebase Admin inicializado com sucesso.');
  } else {
    console.warn(
      'Aviso: Firebase Admin não configurado. Coloque serviceAccountKey.json na pasta backend/ ou defina FIREBASE_SERVICE_ACCOUNT.'
    );
  }
} catch (err) {
  console.warn('Aviso: Erro ao inicializar Firebase Admin:', err.message);
}

function isFirebaseInitialized() {
  return firebaseInitialized;
}

function getAuth() {
  return admin.auth();
}

module.exports = { isFirebaseInitialized, getAuth };
