const express = require('express');
const router = express.Router();
const cuponsController = require('../controllers/cuponsController');
const clientesService = require('../services/clientesService');
const { authMiddleware, requireAuth, requireAdmin, validar } = require('../middleware');
const { schemaCupom, schemaCupomPut, schemaAplicarCupom } = require('../schemas/cuponsSchema');

router.get('/', authMiddleware, requireAuth, cuponsController.listar);
router.get('/:id', authMiddleware, requireAuth, cuponsController.buscarPorId);
router.post('/', authMiddleware, requireAuth, requireAdmin, validar(schemaCupom), cuponsController.criar);
router.put('/:id', authMiddleware, requireAuth, requireAdmin, validar(schemaCupomPut), cuponsController.atualizar);
router.delete('/:id', authMiddleware, requireAuth, requireAdmin, cuponsController.excluir);

router.post('/aplicar', authMiddleware, validar(schemaAplicarCupom), async (req, res, next) => {
  if (req.firebaseDecoded) {
    try {
      const cliente = await clientesService.buscarPorFirebaseUid(req.firebaseDecoded.uid);
      if (cliente) req.clienteId = cliente.id;
    } catch {}
  }
  cuponsController.aplicar(req, res, next);
});

module.exports = router;
