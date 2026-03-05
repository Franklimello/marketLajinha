const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/appointmentsController');
const { authMiddleware, validar } = require('../middleware');
const {
  schemaCreateAppointment,
  schemaProviderAction,
  schemaClientResponse,
  schemaCancelAppointment,
  schemaProviderSlotUpdate,
  schemaProviderDayOccupancyUpdate,
  schemaProviderDefaultScheduleUpdate,
} = require('../schemas/appointmentsSchema');

router.get('/available-slots', ctrl.horariosDisponiveis);
router.post('/', authMiddleware, validar(schemaCreateAppointment), ctrl.criar);
router.get('/mine', authMiddleware, ctrl.minhas);

router.get('/provider', authMiddleware, ctrl.prestadorListar);
router.get('/provider/schedule', authMiddleware, ctrl.prestadorAgenda);
router.get('/provider/clients', authMiddleware, ctrl.prestadorClientes);
router.patch('/provider/slots', authMiddleware, validar(schemaProviderSlotUpdate), ctrl.prestadorAtualizarSlot);
router.patch('/provider/day-occupancy', authMiddleware, validar(schemaProviderDayOccupancyUpdate), ctrl.prestadorAtualizarDia);
router.patch('/provider/default-schedule', authMiddleware, validar(schemaProviderDefaultScheduleUpdate), ctrl.prestadorAplicarPadrao);
router.patch('/:id/provider-action', authMiddleware, validar(schemaProviderAction), ctrl.prestadorAcao);
router.patch('/:id/provider-cancel', authMiddleware, validar(schemaCancelAppointment), ctrl.prestadorCancelar);
router.patch('/:id/provider-complete', authMiddleware, ctrl.prestadorConcluir);

router.patch('/:id/client-response', authMiddleware, validar(schemaClientResponse), ctrl.clienteResposta);
router.patch('/:id/client-cancel', authMiddleware, validar(schemaCancelAppointment), ctrl.clienteCancelar);

module.exports = router;
