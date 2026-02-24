const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authMiddleware } = require('../middleware');

function requireSuperAdmin(req, res, next) {
  const superUid = process.env.SUPER_ADMIN_UID;
  if (!superUid) return res.status(503).json({ erro: 'Super admin não configurado.' });
  if (!req.firebaseDecoded) return res.status(401).json({ erro: 'Não autorizado.' });
  if (req.firebaseDecoded.uid !== superUid) {
    return res.status(403).json({ erro: 'Acesso negado. Apenas o administrador do sistema.' });
  }
  next();
}

router.use(authMiddleware, requireSuperAdmin);

router.get('/stats', adminController.estatisticas);
router.get('/lojas', adminController.listarTodasLojas);
router.get('/lojas/:id', adminController.buscarLoja);
router.get('/cobrancas/loja/:id', adminController.listarCobrancasPorLoja);
router.post('/cobrancas/loja/:id/gerar', adminController.gerarCobrancaLoja);
router.patch('/lojas/:id/bloquear', adminController.bloquearLoja);
router.patch('/lojas/:id/desbloquear', adminController.desbloquearLoja);
router.delete('/lojas/:id', adminController.excluirLoja);

router.get('/motoboys', adminController.listarMotoboys);
router.patch('/motoboys/:id/reset-senha', adminController.resetSenhaMotoboy);
router.get('/lojistas', adminController.listarLojistas);
router.patch('/lojistas/:id/reset-senha', adminController.resetSenhaLojista);

router.post('/cache/flush', adminController.flushCache);

module.exports = router;
