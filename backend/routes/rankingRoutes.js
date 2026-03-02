const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/rankingController');
const { authMiddleware } = require('../middleware');

router.get('/mensal', authMiddleware, ctrl.obterMensalPorCidade);

module.exports = router;
