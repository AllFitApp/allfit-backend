import express from 'express';

import appointmentsRouter from './routers/appointments/router';
import authRouter from './routers/auth/router';
import customerRouter from './routers/pagarme/customerRouter';
import paymentsRouter from './routers/pagarme/paymentsRouter';
import walletRouter from './routers/pagarme/walletRouter';
import webhookRouter from './routers/pagarme/webhookRouter';
import postsRouter from './routers/posts/router';
import profileRouter from './routers/profile/router';
import singleWorkout from './routers/singleWorkouts/router';

import 'dotenv/config'; // ou
import { exerciseRouter } from './routers/exercises/router';
import { partnerGymRouter } from './routers/partnerGym/router';
import { workoutRouter } from './routers/workout/router';
require('dotenv').config();

const router = express.Router();

router.use('/webhook', webhookRouter);

router.use('/auth', authRouter);
router.use('/profile', profileRouter);
router.use('/appointments', appointmentsRouter);
router.use('/posts', postsRouter);
router.use('/payments', paymentsRouter);
router.use('/single-workout', singleWorkout);
router.use('/wallet', walletRouter);
router.use('/customer', customerRouter);
router.use('/workouts', workoutRouter);
router.use('/exercises', exerciseRouter);
router.use('/partner-gyms', partnerGymRouter);
// (async () => {
// 	const url = await ngrok.connect({
// 		addr: 3002,
// 		authtoken: process.env.NGROK_AUTH_TOKEN, // opcional, veja abaixo
// 	});
// 	console.log(`🌐 URL pública: ${url}`);
// })();

export default router;
