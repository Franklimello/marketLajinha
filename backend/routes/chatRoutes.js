const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/chatController');
const { authMiddleware, requireAuth } = require('../middleware');

router.get('/:pedidoId/mensagens', authMiddleware, ctrl.listarMensagens);
router.post('/:pedidoId/mensagens/loja', authMiddleware, requireAuth, ctrl.enviarMensagemLoja);
router.post('/:pedidoId/mensagens/cliente', authMiddleware, ctrl.enviarMensagemCliente);
router.get('/nao-lidas', authMiddleware, requireAuth, ctrl.naoLidasLoja);

module.exports = router;
