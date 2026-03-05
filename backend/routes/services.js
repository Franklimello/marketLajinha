const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/servicesController');
const { authMiddleware, validar } = require('../middleware');
const { schemaCreateService, schemaUpdateService } = require('../schemas/servicesSchema');

router.get('/providers', ctrl.listarPrestadores);
router.get('/providers/:providerId', ctrl.perfilPrestador);

router.get('/mine', authMiddleware, ctrl.meusServicos);
router.post('/', authMiddleware, validar(schemaCreateService), ctrl.criarServico);
router.put('/:id', authMiddleware, validar(schemaUpdateService), ctrl.atualizarServico);
router.delete('/:id', authMiddleware, ctrl.excluirServico);

module.exports = router;
