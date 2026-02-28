const express = require('express');
const router = express.Router();
const feedController = require('../controllers/feedController');
const { authMiddleware, requireAuth } = require('../middleware');

router.get('/posts', authMiddleware, feedController.listarPosts);
router.get('/posts/:id/comments', authMiddleware, feedController.listarComentarios);

router.post('/posts', authMiddleware, requireAuth, feedController.criarPost);
router.post('/posts/:id/like-toggle', authMiddleware, feedController.toggleLike);
router.post('/posts/:id/comments', authMiddleware, feedController.comentar);
router.post('/posts/:id/vote', authMiddleware, feedController.votar);

module.exports = router;
