const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/motoboyController');
const { authMiddleware, requireAuth, requireAdmin } = require('../middleware');
const motoboyService = require('../services/motoboyService');

function motoboyAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token obrigatório.' });
  }
  try {
    const decoded = motoboyService.verificarToken(auth.slice(7));
    if (decoded.role !== 'MOTOBOY') {
      return res.status(403).json({ erro: 'Acesso negado.' });
    }
    req.motoboy = decoded;
    next();
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }
}

router.post('/login', ctrl.login);

router.get('/pedidos', motoboyAuth, ctrl.meusPedidos);
router.patch('/pedidos/:id/status', motoboyAuth, ctrl.atualizarStatus);

router.get('/', authMiddleware, requireAuth, requireAdmin, ctrl.listar);
router.get('/:id', authMiddleware, requireAuth, requireAdmin, ctrl.buscarPorId);
router.post('/', authMiddleware, requireAuth, requireAdmin, ctrl.criar);
router.put('/:id', authMiddleware, requireAuth, requireAdmin, ctrl.atualizar);
router.delete('/:id', authMiddleware, requireAuth, requireAdmin, ctrl.excluir);

module.exports = router;
