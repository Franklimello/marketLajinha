/**
 * Rotas de Usuários. Apenas ADMIN da loja pode gerenciar.
 */
const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuariosController');
const { authMiddleware, requireAuth, requireAdmin, validar } = require('../middleware');
const { schemaUsuarios, schemaUsuariosPut } = require('../schemas/usuariosSchema');

router.get('/', authMiddleware, requireAuth, requireAdmin, usuariosController.listar);
router.get('/:id', authMiddleware, requireAuth, usuariosController.buscarPorId);

router.post('/', authMiddleware, requireAuth, requireAdmin, validar(schemaUsuarios), usuariosController.criar);
router.put('/:id', authMiddleware, requireAuth, requireAdmin, validar(schemaUsuariosPut), usuariosController.atualizar);
router.delete('/:id', authMiddleware, requireAuth, requireAdmin, usuariosController.excluir);

module.exports = router;
