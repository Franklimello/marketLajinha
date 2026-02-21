const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/clientesController');
const { authMiddleware } = require('../middleware');

router.get('/me', authMiddleware, ctrl.meuPerfil);
router.post('/cadastro', authMiddleware, ctrl.cadastrar);
router.put('/me', authMiddleware, ctrl.atualizarPerfil);

router.get('/me/enderecos', authMiddleware, ctrl.listarEnderecos);
router.post('/me/enderecos', authMiddleware, ctrl.criarEndereco);
router.put('/me/enderecos/:id', authMiddleware, ctrl.atualizarEndereco);
router.patch('/me/enderecos/:id/padrao', authMiddleware, ctrl.definirPadrao);
router.delete('/me/enderecos/:id', authMiddleware, ctrl.excluirEndereco);

router.post('/me/fcm-token', authMiddleware, ctrl.salvarFcmToken);
router.delete('/me/fcm-token', authMiddleware, ctrl.removerFcmToken);

module.exports = router;
