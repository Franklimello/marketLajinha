const express = require('express');
const router = express.Router();
const lojasController = require('../controllers/lojasController');
const { authMiddleware, requireAuth } = require('../middleware');

router.get('/:id/status', authMiddleware, requireAuth, lojasController.obterStatusOperacional);

module.exports = router;

