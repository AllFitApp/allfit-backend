import { Router } from 'express';
import { authController } from './auth.controller';
import { signUpSchema } from './schema';
import { parseJsonBody } from '../../middleware/auth.middleware';

const router = Router();

router.use(parseJsonBody); // Middleware para analisar o corpo da requisição
router.post('/signUp', authController.singUp),
router.post('/login', authController.login);
export default router;
