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
const cuponsRoutes = require('./cuponsRoutes');
const motoboyRoutes = require('./motoboyRoutes');
const combosRoutes = require('./combosRoutes');
const authRoutes = require('./authRoutes');
const avaliacoesRoutes = require('./avaliacoesRoutes');
const chatRoutes = require('./chatRoutes');
const promocoesRoutes = require('./promocoesRoutes');
const storiesRoutes = require('./storiesRoutes');
const cidadesRoutes = require('./cidadesRoutes');
const feedRoutes = require('./feedRoutes');
const storesRoutes = require('./storesRoutes');

router.get('/health', (req, res) => res.json({ ok: true, mensagem: 'API marcket no ar.' }));

router.use('/lojas', lojasRoutes);
router.use('/lojas', bairrosRoutes);
router.use('/produtos', produtosRoutes);
router.use('/usuarios', usuariosRoutes);
router.use('/pedidos', pedidosRoutes);
router.use('/clientes', clientesRoutes);
router.use('/admin', adminRoutes);
router.use('/impressoras', impressorasRoutes);
router.use('/cupons', cuponsRoutes);
router.use('/motoboys', motoboyRoutes);
router.use('/combos', combosRoutes);
router.use('/auth', authRoutes);
router.use('/avaliacoes', avaliacoesRoutes);
router.use('/chat', chatRoutes);
router.use('/promocoes', promocoesRoutes);
router.use('/cidades', cidadesRoutes);
router.use('/feed', feedRoutes);
router.use('/stores', storesRoutes);
router.use('/', storiesRoutes);

module.exports = router;
