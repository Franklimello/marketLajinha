/**
 * Middleware de autenticação (Firebase JWT) e autorização por loja/role.
 */
const { prisma } = require('../config/database');
const { isFirebaseInitialized, getAuth } = require('../config/firebase');

function getBearerToken(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

function getAuthToken(req) {
  const bearer = getBearerToken(req);
  if (bearer) return bearer;
  const cookieToken = req.cookies?.session;
  if (cookieToken && typeof cookieToken === 'string') return cookieToken;
  return null;
}

async function authMiddleware(req, res, next) {
  req.user = null;
  req.firebaseDecoded = null;
  const token = getAuthToken(req);
  if (!token) return next();
  if (!isFirebaseInitialized()) return next();

  try {
    const firebaseAuth = getAuth();
    let decoded;
    try {
      decoded = await firebaseAuth.verifyIdToken(token);
    } catch {
      decoded = await firebaseAuth.verifySessionCookie(token, true);
    }
    req.firebaseDecoded = decoded;
    const usuario = await prisma.usuarios.findUnique({
      where: { firebase_uid: decoded.uid },
      select: { id: true, loja_id: true, role: true, firebase_uid: true },
    });
    if (usuario) req.user = usuario;
  } catch (err) {
    if (err.code === 'auth/id-token-expired') {
      return res.status(401).json({ erro: 'Token expirado. Faça login novamente.' });
    }
    if (err.code === 'auth/id-token-revoked') {
      return res.status(401).json({ erro: 'Token revogado. Faça login novamente.' });
    }
    if (err.code === 'auth/argument-error' || err.code === 'auth/invalid-id-token') {
      return res.status(401).json({ erro: 'Token inválido.' });
    }
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ erro: 'Não autorizado. Token inválido ou ausente.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ erro: 'Não autorizado.' });
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ erro: 'Acesso negado. Apenas administradores podem realizar esta ação.' });
  }
  next();
}

function requireSameStore(storeIdParam = 'id') {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ erro: 'Não autorizado.' });
    const lojaId = req.params[storeIdParam] || req.params.lojaId || req.body?.loja_id;
    if (req.user.loja_id !== lojaId) {
      return res.status(403).json({ erro: 'Acesso negado. Recurso de outra loja.' });
    }
    next();
  };
}

module.exports = {
  getBearerToken,
  getAuthToken,
  authMiddleware,
  requireAuth,
  requireAdmin,
  requireSameStore,
};
