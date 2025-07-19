// routes/pagarme.ts
import { Router } from 'express';

import PaymentController from '@/infra/controller/PaymentsController';

const router = Router();

router.post('/one-time', PaymentController.paySingleWorkout); // Realiza pagamento avulso: cartão ou Pix ✅  (necessita de método rollback ou webhook)
router.post('/single-workout', PaymentController.createSingleWorkoutModel); // Cria modelo de aula avulsa ✅
router.get('/single-workout/:username', PaymentController.getSingleWorkout); // Busca aula avulsa ✅
router.delete('/single-workout', PaymentController.deleteSingleWorkout); // Deleta plano de aula avulsa

router.post('/plan', PaymentController.createMonthlyModel); // Cria modelo de assinatura ✅
router.get('/plans', PaymentController.getTrainerPlans); // Lista planos criados do treinador ✅
router.get('/transactions/:userId', PaymentController.getTransactions); // Lista transações ✅
router.delete('/plan/:planId', PaymentController.deleteSubscriptionModel); // Deleta plano ✅ (necessita de método rollback)

router.post('/subscription', PaymentController.payMonthlySubscription); // Assinatura mensalidade ✅
router.get('/subscriptions/:userId', PaymentController.listSubscriptions); // Lista inscrições criados do treinador ✅
router.delete('/subscription/:userId/:subscriptionId', PaymentController.cancelSubscription); // Cancela assinatura de aluno ✅

export default router;
