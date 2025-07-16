// infra/webhooks/PagarmeWebhookHandler.ts
import { Request, Response } from 'express';
import {
	handleOrderFailed,
	handleOrderPaid,
	handleSubscriptionChargeFailed,
	handleSubscriptionChargePaid,
	handleSubscriptionCreated,
	handleTransferFailed,
	handleTransferPaid,
} from './wallet';

export async function webhookHandler(req: Request, res: Response) {
	try {
		const { type, data } = req.body;

		switch (type) {
			case 'order.paid':
				await handleOrderPaid(data);
				break;
			case 'order.payment_failed':
				await handleOrderFailed(data);
				break;
			case 'subscription.created':
				await handleSubscriptionCreated(data);
				break;
			case 'subscription.charge_paid':
				await handleSubscriptionChargePaid(data);
				break;
			case 'subscription.charge_failed':
				await handleSubscriptionChargeFailed(data);
				break;
			case 'transfer.paid':
				await handleTransferPaid(data);
				break;
			case 'transfer.failed':
				await handleTransferFailed(data);
				break;
			default:
				console.log(`Evento ignorado: ${type}`);
				break;
		}

		res.sendStatus(200);
	} catch (err) {
		console.error('Erro ao processar webhook:', err);
		res.status(500).send('Erro no webhook');
	}
}
