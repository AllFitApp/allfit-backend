import express from 'express';
import authRouter from './routers/auth/router';
import profileRouter from './routers/profile/router';

const router = express.Router();
router.use('/auth', authRouter);
router.use('/profile', profileRouter);
export default router;