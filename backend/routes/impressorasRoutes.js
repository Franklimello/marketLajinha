const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/impressorasController');
const { authMiddleware, requireAuth, requireAdmin } = require('../middleware');

router.get('/fila', ctrl.filaAgente);
router.get('/agente/printers', ctrl.listarAgente);
router.patch('/fila/:id/impresso', ctrl.filaMarcarImpresso);
router.patch('/fila/:id/erro', ctrl.filaMarcarErro);

router.use(authMiddleware, requireAuth);

router.get('/', ctrl.listar);
router.post('/', requireAdmin, ctrl.criar);
router.put('/:id', requireAdmin, ctrl.atualizar);
router.delete('/:id', requireAdmin, ctrl.excluir);
router.post('/:id/testar', requireAdmin, ctrl.testar);
router.post('/imprimir/:pedidoId', ctrl.imprimirPedido);
router.get('/token', requireAdmin, ctrl.obterToken);
router.post('/token/gerar', requireAdmin, ctrl.gerarToken);
router.post('/fila/:id/reenviar', requireAdmin, ctrl.filaReenviar);

module.exports = router;
