import express from 'express';

import appointmentsRouter from './routers/appointments/router';
import authRouter from './routers/auth/router';
import customerRouter from './routers/pagarme/customerRouter';
import paymentsRouter from './routers/pagarme/paymentsRouter';
import walletRouter from './routers/pagarme/walletRouter';
import postsRouter from './routers/posts/router';
import profileRouter from './routers/profile/router';

const router = express.Router();

router.use('/auth', authRouter);
router.use('/profile', profileRouter);
router.use('/appointments', appointmentsRouter);
router.use('/posts', postsRouter);
router.use('/payments', paymentsRouter);
router.use('/wallet', walletRouter);
router.use('/customer', customerRouter);

export default router;
