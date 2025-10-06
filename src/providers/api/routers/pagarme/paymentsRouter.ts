// routes/pagarme.ts
import { Router } from 'express';

import PaymentController from '@/infra/controller/PaymentsController';
import { upload } from '@/lib/multer';

const router = Router();

// ===== PAGAMENTOS =====
router.post('/single-workout', PaymentController.paySingleWorkout); // Realiza pagamento avulso: cartão ou Pix ✅ (necessita de método rollback ou webhook)

// ===== PLANOS/ASSINATURAS =====
router.post('/plan', upload.single('subscriptions-images'), PaymentController.createMonthlyModel); // Cria modelo de assinatura ✅
router.get('/plans/:username', PaymentController.getTrainerPlans); // Lista planos criados do treinador ✅
router.get('/plan/:planId', PaymentController.getTrainerPlan); // Lista planos criados do treinador ✅
router.put('/plan/:planId', PaymentController.editPlans); // Editar plano ✅ (necessita de método rollback)
router.patch('/plan/:planId', PaymentController.disablePlan); // Editar plano ✅ (necessita de método rollback)
router.delete('/plan/:planId', PaymentController.deleteSubscriptionModel); // Deleta plano ✅ (necessita de método rollback)

router.post('/subscription', PaymentController.payMonthlySubscription); // Assinatura mensalidade ✅
router.get('/subscription/:subscriptionId', PaymentController.getSubscription); // Assinatura mensalidade ✅
router.get('/subscriptions/:userId', PaymentController.listSubscriptions);
router.get('/subscriptions/:trainerId/trainer', PaymentController.getTrainerStudents); // Lista assinaturas do treinador
router.patch('/subscription/:userId/:subscriptionId', PaymentController.cancelSubscription); // Cancela assinatura de aluno ✅

// ===== TRANSAÇÕES =====
router.get('/transactions/:userId', PaymentController.getTransactions); // Lista transações ✅

export default router;
