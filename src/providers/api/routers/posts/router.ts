// src/routes/postRouter.ts
import { upload } from '@/lib/multer';
import { Router } from 'express';
import PostController from '../../../../infra/controller/PostController';
// import { authMiddleware } from '../middlewares/auth';

const router = Router();

// Criação de post (usuário autenticado)
router.post('/', upload.single('media'), PostController.createPost);

// Listar posts de um perfil por username
router.get('/profile/:username', PostController.getPostsByProfile);

// Deletar post (dono apenas)
router.delete('/:postId', PostController.deletePost);

// Curtir post
router.post('/:postId/like', PostController.likePost);

// Descurtir post
router.delete('/:postId/like', PostController.unlikePost);

export default router;
