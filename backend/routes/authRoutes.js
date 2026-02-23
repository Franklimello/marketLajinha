const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/authController');
const { authMiddleware } = require('../middleware');
const { validar } = require('../middleware');
const { schemaForgotPassword, schemaResetPassword, schemaSession } = require('../schemas/authSchema');

router.post('/forgot-password', validar(schemaForgotPassword), ctrl.forgotPassword);
router.post('/reset-password', validar(schemaResetPassword), ctrl.resetPassword);
router.post('/session', validar(schemaSession), ctrl.createSession);
router.post('/session/refresh', validar(schemaSession), ctrl.refreshSession);
router.delete('/session', authMiddleware, ctrl.clearSession);

module.exports = router;
