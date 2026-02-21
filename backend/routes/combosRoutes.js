const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/combosController');
const { authMiddleware, requireAuth, requireAdmin } = require('../middleware');

router.get('/loja/:lojaId', ctrl.listarPublico);

router.use(authMiddleware, requireAuth);

router.get('/', ctrl.listar);
router.get('/:id', ctrl.buscar);
router.post('/', requireAdmin, ctrl.criar);
router.put('/:id', requireAdmin, ctrl.atualizar);
router.delete('/:id', requireAdmin, ctrl.excluir);

module.exports = router;
