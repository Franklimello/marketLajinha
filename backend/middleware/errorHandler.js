/**
 * Middleware global de tratamento de erros.
 * Em produção, nunca expõe stack trace nem códigos internos.
 */
const IS_PROD = process.env.NODE_ENV === 'production';

function errorHandler(err, req, res, _next) {
  if (IS_PROD) {
    console.error(`[ERRO] ${req.method} ${req.path}: ${err.message}`);
  } else {
    console.error(err);
  }

  if (err.status) {
    return res.status(err.status).json({ erro: err.message });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({ erro: 'Registro não encontrado.' });
  }

  if (err.code === 'P2002') {
    return res.status(409).json({ erro: 'Registro duplicado.' });
  }

  if (err.code && err.code.startsWith('P2')) {
    return res.status(400).json({ erro: 'Erro de validação no banco de dados.' });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ erro: 'Payload muito grande. Limite: 1MB.' });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição.' });
  }

  res.status(500).json({ erro: 'Erro interno do servidor.' });
}

module.exports = errorHandler;
