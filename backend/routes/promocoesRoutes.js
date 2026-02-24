const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/promocoesController');
const { authMiddleware, requireAuth, requireAdmin, validar } = require('../middleware');
const { schemaPromocao, schemaPromocaoPut } = require('../schemas/promocoesSchema');

router.get('/loja/:lojaId', ctrl.listarPublico);

router.use(authMiddleware, requireAuth, requireAdmin);

router.get('/', ctrl.listar);
router.get('/:id', ctrl.buscar);
router.post('/', validar(schemaPromocao), ctrl.criar);
router.put('/:id', validar(schemaPromocaoPut), ctrl.atualizar);
router.delete('/:id', ctrl.excluir);

module.exports = router;
