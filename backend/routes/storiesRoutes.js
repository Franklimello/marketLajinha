const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/storiesController');
const { authMiddleware, requireAuth } = require('../middleware');

router.get('/stories/active', ctrl.listarAtivos);

router.get('/stories/mine', authMiddleware, requireAuth, ctrl.listarDaMinhaLoja);

router.post(
  '/restaurants/:id/stories',
  authMiddleware,
  requireAuth,
  ctrl.criar
);

router.delete('/stories/:id', authMiddleware, requireAuth, ctrl.excluir);

module.exports = router;
