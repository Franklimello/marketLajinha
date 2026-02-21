/**
 * Rotas de Usuários. Apenas ADMIN da loja pode gerenciar.
 */
const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuariosController');
const { authMiddleware, requireAuth, requireAdmin, validar } = require('../middleware');
const { schemaUsuarios, schemaUsuariosPut } = require('../schemas/usuariosSchema');
const { salvarTokenLoja, removerTokenLoja } = require('../services/notificacaoService');

router.get('/', authMiddleware, requireAuth, requireAdmin, usuariosController.listar);
router.get('/:id', authMiddleware, requireAuth, usuariosController.buscarPorId);

router.post('/', authMiddleware, requireAuth, requireAdmin, validar(schemaUsuarios), usuariosController.criar);
router.put('/:id', authMiddleware, requireAuth, requireAdmin, validar(schemaUsuariosPut), usuariosController.atualizar);
router.delete('/:id', authMiddleware, requireAuth, requireAdmin, usuariosController.excluir);

router.post('/me/fcm-token', authMiddleware, requireAuth, async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ erro: 'Token FCM obrigatório.' });
    await salvarTokenLoja(req.user.id, token);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete('/me/fcm-token', authMiddleware, requireAuth, async (req, res, next) => {
  try {
    const { token } = req.body;
    if (token) await removerTokenLoja(token);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
