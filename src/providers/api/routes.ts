import express from 'express';

import appointmentsRouter from './routers/appointments/router';
import authRouter from './routers/auth/router';
import profileRouter from './routers/profile/router';

const router = express.Router();

router.use('/auth', authRouter);
router.use('/profile', profileRouter);
router.use('/appointments', appointmentsRouter);

export default router;
