/**
 * Rotas de Produtos. Listagem com paginação (12 por página).
 */
const express = require('express');
const router = express.Router();
const produtosController = require('../controllers/produtosController');
const { authMiddleware, requireAuth, validar } = require('../middleware');
const { schemaProdutos, schemaProdutosPut } = require('../schemas/produtosSchema');

router.get('/', authMiddleware, produtosController.listar);
router.get('/:id', produtosController.buscarPorId);

router.post('/', authMiddleware, requireAuth, validar(schemaProdutos), produtosController.criar);
router.put('/:id', authMiddleware, requireAuth, validar(schemaProdutosPut), produtosController.atualizar);
router.delete('/:id', authMiddleware, requireAuth, produtosController.excluir);

module.exports = router;
