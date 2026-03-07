const https = require('https');
const http = require('http');

const FIREBASE_API_KEY = 'AIzaSyDF51FzoLyRU52X4-jXMW1evIr3DKw9vQ8';

function createHttpError(statusCode, message, payload = null) {
  const err = new Error(message || `HTTP ${statusCode}`);
  err.statusCode = Number(statusCode || 0);
  err.payload = payload;
  return err;
}

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const body = options.body ? JSON.stringify(options.body) : null;
    const parsed = new URL(url);

    const req = mod.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
        ...(options.headers || {}),
      },
    }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : null;
          if (res.statusCode >= 400) {
            const errMsg = json.error?.message || json.erro || `HTTP ${res.statusCode}`;
            reject(createHttpError(res.statusCode, errMsg, json));
          } else {
            resolve(json);
          }
        } catch {
          if (res.statusCode >= 400) {
            reject(createHttpError(res.statusCode, data || `HTTP ${res.statusCode}`));
          }
          else resolve(data);
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
    if (body) req.write(body);
    req.end();
  });
}

async function firebaseLogin(email, password) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;
  const res = await request(url, {
    method: 'POST',
    body: { email, password, returnSecureToken: true },
  });
  return { idToken: res.idToken, uid: res.localId, email: res.email };
}

async function fetchMinhaLoja(apiUrl, idToken) {
  return request(`${apiUrl}/lojas/minha`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
}

async function getOrCreatePrintToken(apiUrl, idToken, currentToken) {
  if (currentToken) return currentToken;
  const res = await request(`${apiUrl}/impressoras/token/gerar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` },
  });
  const token = res?.token_impressao || res?.token || '';
  if (!token) throw new Error('Servidor nao retornou token de impressao.');
  return token;
}

async function login(apiUrl, email, password) {
  const firebase = await firebaseLogin(email, password);
  const loja = await fetchMinhaLoja(apiUrl, firebase.idToken);
  if (!loja || !loja.id) throw new Error('Nenhuma loja vinculada a esta conta.');
  const printToken = await getOrCreatePrintToken(apiUrl, firebase.idToken, loja.token_impressao);
  return { loja, printToken };
}

function apiRequest(apiUrl, path, printToken, options = {}) {
  return request(`${apiUrl}${path}`, {
    ...options,
    headers: { 'x-print-token': printToken, ...(options.headers || {}) },
  });
}

module.exports = { login, apiRequest, request };
