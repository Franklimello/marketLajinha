/**
 * Middleware de validação com Zod.
 */
function validar(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const mensagens = result.error.errors.map((e) => e.message).join('; ');
      return res.status(400).json({ erro: 'Validação falhou.', detalhes: mensagens });
    }
    req.validated = result.data;
    next();
  };
}

module.exports = { validar };
