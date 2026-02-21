/**
 * Ponto único de exportação dos middlewares.
 * Uso: const { authMiddleware, requireAuth, validar, errorHandler } = require('../middleware');
 */
const auth = require('./auth');
const { validar } = require('./validacao');
const errorHandler = require('./errorHandler');

module.exports = {
  ...auth,
  validar,
  errorHandler,
};
