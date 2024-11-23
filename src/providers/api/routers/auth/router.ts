import { Router } from 'express';
import { authController } from './auth.controller';
import { signInSchema } from './schema';
const router = Router();

router.post('/signin', authController.signIn, signInSchema);

export default router;
