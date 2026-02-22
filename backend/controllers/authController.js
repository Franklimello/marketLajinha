const authService = require('../services/authService');

const GENERIC_MESSAGE = 'Se o email existir, você receberá um link de recuperação.';

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

module.exports = { forgotPassword, resetPassword };
