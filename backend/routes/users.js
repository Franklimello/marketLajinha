const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/usersController');
const { authMiddleware, validar } = require('../middleware');
const { schemaRegisterAccountType, schemaUpdateMe } = require('../schemas/usersSchema');

router.get('/me', authMiddleware, ctrl.me);
router.post('/register-account-type', authMiddleware, validar(schemaRegisterAccountType), ctrl.registerAccountType);
router.put('/me', authMiddleware, validar(schemaUpdateMe), ctrl.updateMe);
router.post('/me/fcm-token', authMiddleware, ctrl.saveMyFcmToken);
router.delete('/me/fcm-token', authMiddleware, ctrl.removeMyFcmToken);

module.exports = router;
