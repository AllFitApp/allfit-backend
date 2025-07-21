// routes/webhook.ts
import { WebhookController } from '@/infra/controller/webhookController';
import express from 'express';

const webhookRouter = express.Router();

// Middleware específico para webhooks - precisa processar o body como raw
webhookRouter.use('/pagarme', express.raw({
	type: 'application/json',
	limit: '10mb' // limite do tamanho do payload
}));

// Endpoint principal do webhook do Pagar.me
webhookRouter.post('/pagarme', WebhookController.handlePagarmeWebhook);

// Endpoint para testar se o webhook está funcionando
webhookRouter.get('/pagarme/health', (req, res) => {
	res.status(200).json({
		message: 'Webhook endpoint está funcionando',
		timestamp: new Date().toISOString()
	});
});

export default webhookRouter;

// No seu app.ts principal, adicione:
/*
import webhookRoutes from './routes/webhook';

// IMPORTANTE: As rotas de webhook devem vir ANTES do middleware express.json()
app.use('/webhook', webhookRoutes);

// Depois vem o express.json() para as outras rotas
app.use(express.json());
*/