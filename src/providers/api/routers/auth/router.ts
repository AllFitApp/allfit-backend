import { Router } from 'express';
import AuthController  from '../../../../infra/controller/AuthController';
import { signUpSchema } from './schema';
import { parseJsonBody } from '../../middleware/auth.middleware';

const router = Router();

router.use(parseJsonBody); // Middleware para analisar o corpo da requisição
router.post('/signUp', AuthController.signUp),
router.post('/login', AuthController.login);
export default router;
