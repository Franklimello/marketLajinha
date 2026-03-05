const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/appointmentsController');
const { authMiddleware, validar } = require('../middleware');
const {
  schemaCreateAppointment,
  schemaProviderAction,
  schemaClientResponse,
  schemaProviderSlotUpdate,
} = require('../schemas/appointmentsSchema');

router.get('/available-slots', ctrl.horariosDisponiveis);
router.post('/', authMiddleware, validar(schemaCreateAppointment), ctrl.criar);
router.get('/mine', authMiddleware, ctrl.minhas);

router.get('/provider', authMiddleware, ctrl.prestadorListar);
router.get('/provider/schedule', authMiddleware, ctrl.prestadorAgenda);
router.patch('/provider/slots', authMiddleware, validar(schemaProviderSlotUpdate), ctrl.prestadorAtualizarSlot);
router.patch('/:id/provider-action', authMiddleware, validar(schemaProviderAction), ctrl.prestadorAcao);

router.patch('/:id/client-response', authMiddleware, validar(schemaClientResponse), ctrl.clienteResposta);

module.exports = router;
