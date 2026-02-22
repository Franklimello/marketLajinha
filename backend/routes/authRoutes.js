const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/authController');
const { validar } = require('../middleware');
const { schemaForgotPassword, schemaResetPassword } = require('../schemas/authSchema');

router.post('/forgot-password', validar(schemaForgotPassword), ctrl.forgotPassword);
router.post('/reset-password', validar(schemaResetPassword), ctrl.resetPassword);

module.exports = router;
