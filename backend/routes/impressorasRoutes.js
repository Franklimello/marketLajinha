const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/impressorasController');
const { authMiddleware, requireAuth, requireAdmin } = require('../middleware');

router.use(authMiddleware, requireAuth);

router.get('/', ctrl.listar);
router.post('/', requireAdmin, ctrl.criar);
router.put('/:id', requireAdmin, ctrl.atualizar);
router.delete('/:id', requireAdmin, ctrl.excluir);
router.post('/:id/testar', requireAdmin, ctrl.testar);
router.post('/imprimir/:pedidoId', ctrl.imprimirPedido);

module.exports = router;
