/**
 * Rotas de Pedidos. POST público (criar pedido); demais exigem auth da loja.
 */
const express = require('express');
const router = express.Router();
const pedidosController = require('../controllers/pedidosController');
const { authMiddleware, requireAuth, requireAdmin, validar } = require('../middleware');
const { schemaPedidos, schemaPedidosStatus } = require('../schemas/pedidosSchema');

router.get('/', authMiddleware, requireAuth, pedidosController.listar);
router.get('/meus', authMiddleware, pedidosController.meusPedidos);
router.get('/:id', authMiddleware, requireAuth, pedidosController.buscarPorId);

router.post('/', authMiddleware, validar(schemaPedidos), pedidosController.criar);

router.patch('/:id/status', authMiddleware, requireAuth, validar(schemaPedidosStatus), pedidosController.atualizarStatus);
router.put('/:id', authMiddleware, requireAuth, pedidosController.atualizar);
router.delete('/:id', authMiddleware, requireAuth, requireAdmin, pedidosController.excluir);

module.exports = router;
