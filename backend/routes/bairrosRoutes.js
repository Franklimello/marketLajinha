const express = require('express');
const router = express.Router();
const bairrosController = require('../controllers/bairrosController');
const { authMiddleware, requireAuth } = require('../middleware');

router.get('/:lojaId/bairros', bairrosController.listar);

router.post('/:lojaId/bairros', authMiddleware, requireAuth, bairrosController.criar);
router.post('/:lojaId/bairros/lote', authMiddleware, requireAuth, bairrosController.criarVarios);
router.put('/:lojaId/bairros/:id', authMiddleware, requireAuth, bairrosController.atualizar);
router.patch('/:lojaId/bairros/:id/ativo', authMiddleware, requireAuth, bairrosController.alterarAtivo);
router.delete('/:lojaId/bairros/:id', authMiddleware, requireAuth, bairrosController.excluir);

module.exports = router;
