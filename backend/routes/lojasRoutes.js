/**
 * Rotas de Lojas. Inclui GET /:lojaId/produtos (produtos da loja).
 */
const express = require('express');
const router = express.Router();
const lojasController = require('../controllers/lojasController');
const produtosController = require('../controllers/produtosController');
const { authMiddleware, requireAuth, requireAdmin, requireSameStore, validar } = require('../middleware');
const { schemaLojas, schemaLojasPut } = require('../schemas/lojasSchema');

router.get('/', authMiddleware, lojasController.listar);
router.get('/home', lojasController.home);
router.get('/ativos', lojasController.listarAtivas);
router.get('/minha', authMiddleware, requireAuth, lojasController.buscarMinhaLoja);
router.get('/slug/:slug', lojasController.buscarPorSlug);
router.get('/:lojaId/produtos', produtosController.listarPorLoja);
router.get('/:id', lojasController.buscarPorId);

router.post('/', authMiddleware, validar(schemaLojas), lojasController.criar);

router.put('/:id', authMiddleware, requireAuth, requireAdmin, requireSameStore('id'), validar(schemaLojasPut), lojasController.atualizar);
router.patch('/:id/toggle', authMiddleware, requireAuth, lojasController.toggle);
router.patch('/:id/automatico', authMiddleware, requireAuth, lojasController.voltarAutomatico);
router.patch('/:id/categorias-desativadas', authMiddleware, requireAuth, lojasController.atualizarCategoriasDesativadas);
router.post('/:id/pix', lojasController.gerarPix);
router.delete('/:id', authMiddleware, requireAuth, requireAdmin, requireSameStore('id'), lojasController.excluir);

module.exports = router;
