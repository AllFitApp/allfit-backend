import express from 'express';
import authRouter from './routers/auth/router';

const router = express.Router();
router.use('/auth', authRouter);

export default router;