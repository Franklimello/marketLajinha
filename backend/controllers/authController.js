const authService = require('../services/authService');
const { getAuth } = require('../config/firebase');

const GENERIC_MESSAGE = 'Se o email existir, você receberá um link de recuperação.';
const COOKIE_NAME = 'session';
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 5; // 5 dias

function buildCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    maxAge: SESSION_MAX_AGE_MS,
    path: '/',
  };
}

async function forgotPassword(req, res, next) {
  try {
    await authService.solicitarRecuperacao(req.validated.email);
    res.json({ mensagem: GENERIC_MESSAGE });
  } catch (e) {
    next(e);
  }
}

async function resetPassword(req, res, next) {
  try {
    await authService.redefinirSenha(req.validated.token, req.validated.newPassword);
    res.json({ mensagem: 'Senha redefinida com sucesso.' });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    next(e);
  }
}

async function createSession(req, res, next) {
  try {
    const { idToken } = req.validated;
    const expiresIn = SESSION_MAX_AGE_MS;
    const sessionCookie = await getAuth().createSessionCookie(idToken, { expiresIn });
    res.cookie(COOKIE_NAME, sessionCookie, buildCookieOptions());
    res.json({ mensagem: 'Sessão criada com sucesso.' });
  } catch (e) {
    return res.status(401).json({ erro: 'Não foi possível criar a sessão.' });
  }
}

async function refreshSession(req, res, next) {
  try {
    const { idToken } = req.validated;
    const expiresIn = SESSION_MAX_AGE_MS;
    const sessionCookie = await getAuth().createSessionCookie(idToken, { expiresIn });
    res.cookie(COOKIE_NAME, sessionCookie, buildCookieOptions());
    res.json({ mensagem: 'Sessão renovada com sucesso.' });
  } catch (e) {
    next(e);
  }
}

async function clearSession(req, res) {
  const opts = buildCookieOptions();
  res.clearCookie(COOKIE_NAME, {
    path: '/',
    httpOnly: opts.httpOnly,
    secure: opts.secure,
    sameSite: opts.sameSite,
  });
  res.status(204).send();
}

module.exports = { forgotPassword, resetPassword, createSession, refreshSession, clearSession };
