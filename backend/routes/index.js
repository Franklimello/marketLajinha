/**
 * Agregador de rotas da API.
 * Health em /health; recursos em /lojas, /produtos, /usuarios, /pedidos.
 */
const express = require('express');
const router = express.Router();
const lojasRoutes = require('./lojasRoutes');
const produtosRoutes = require('./produtosRoutes');
const usuariosRoutes = require('./usuariosRoutes');
const pedidosRoutes = require('./pedidosRoutes');
const bairrosRoutes = require('./bairrosRoutes');
const clientesRoutes = require('./clientesRoutes');
const adminRoutes = require('./adminRoutes');
const impressorasRoutes = require('./impressorasRoutes');

router.get('/health', (req, res) => res.json({ ok: true, mensagem: 'API marcket no ar.' }));

router.use('/lojas', lojasRoutes);
router.use('/lojas', bairrosRoutes);
router.use('/produtos', produtosRoutes);
router.use('/usuarios', usuariosRoutes);
router.use('/pedidos', pedidosRoutes);
router.use('/clientes', clientesRoutes);
router.use('/admin', adminRoutes);
router.use('/impressoras', impressorasRoutes);

module.exports = router;
