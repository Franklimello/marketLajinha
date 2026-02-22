const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/avaliacoesController');
const { validar } = require('../middleware');
const { schemaAvaliacao } = require('../schemas/avaliacoesSchema');
const { authMiddleware } = require('../middleware');

router.post('/', authMiddleware, validar(schemaAvaliacao), ctrl.criar);
router.get('/loja/:lojaId', ctrl.listarPorLoja);
router.get('/loja/:lojaId/media', ctrl.mediaPorLoja);

module.exports = router;
