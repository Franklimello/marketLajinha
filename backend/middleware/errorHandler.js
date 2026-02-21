/**
 * Middleware global de tratamento de erros.
 */
function errorHandler(err, req, res, next) {
  console.error(err);
  if (err.code === 'P2025') {
    return res.status(404).json({ erro: 'Registro não encontrado.' });
  }
  if (err.code && err.code.startsWith('P2')) {
    return res.status(400).json({ erro: 'Erro de banco de dados.', codigo: err.code });
  }
  res.status(500).json({ erro: 'Erro interno do servidor.' });
}

module.exports = errorHandler;
