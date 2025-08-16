import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { Request, Response } from 'express';
import RecipientController from './RecipientController';

const prisma = new PrismaClient();

// Middleware para validar assinatura do webhook (opcional mas recomendado)
function validateWebhookSignature(req: Request): boolean {
	const signature = req.headers['x-hub-signature-256'] as string;
	const payload = JSON.stringify(req.body);
	const secret = process.env.PAGARME_WEBHOOK_SECRET || '';

	if (!signature || !secret) return false;

	const expectedSignature = 'sha256=' + crypto
		.createHmac('sha256', secret)
		.update(payload)
		.digest('hex');

	return crypto.timingSafeEqual(
		Buffer.from(signature),
		Buffer.from(expectedSignature)
	);
}

export class WebhookController {
	static async handlePagarmeWebhook(req: Request, res: Response) {
		try {
			// Validar assinatura (opcional)
			if (process.env.PAGARME_WEBHOOK_SECRET && !validateWebhookSignature(req)) {
				console.log('Webhook: Assinatura inválida');
				return res.status(401).json({ message: 'Assinatura inválida' });
			}

			const { event, data } = req.body;

			console.log(`Webhook recebido: ${event}`, JSON.stringify(data, null, 2));

			// Processar diferentes tipos de eventos
			switch (event) {
				case 'order.paid':
					await WebhookController.handleOrderPaid(data);
					break;

				case 'order.payment_failed':
					await WebhookController.handlePaymentFailed(data);
					break;

				case 'order.canceled':
					await WebhookController.handleOrderCanceled(data);
					break;

				case 'charge.paid':
					await WebhookController.handleChargePaid(data);
					break;

				default:
					console.log(`Evento não processado: ${event}`);
			}

			res.status(200).json({ message: 'Webhook processado com sucesso' });

		} catch (error: any) {
			console.error('Erro no webhook:', error);
			res.status(500).json({ message: 'Erro interno do servidor' });
		}
	}

	// Processar pedido pago com sucesso
	private static async handleOrderPaid(orderData: any) {
		try {
			const orderId = orderData.id;
			console.log(`Processando pedido pago: ${orderId}`);

			// Buscar transação no banco de dados
			const transaction = await prisma.transaction.findFirst({
				where: { orderId },
				include: {
					trainer: {
						include: { wallet: true }
					}
				}
			});

			if (!transaction) {
				console.log(`Transação não encontrada para orderId: ${orderId}`);
				return;
			}

			// Atualizar status da transação original
			await prisma.transaction.update({
				where: { id: transaction.id },
				data: { status: 'paid' }
			});

			// Processar split de pagamento usando o serviço de carteira
			if (transaction.trainerId && transaction.trainer?.wallet) {
				const result = await RecipientController.processPagarmeOrderSplit(
					orderId,
					orderData,
					transaction
				);

				if (result?.success) {
					console.log(`Saldo atualizado para treinador ${transaction.trainerId}: +${result.amount} centavos`);
				}
			}

		} catch (error) {
			console.error('Erro ao processar pedido pago:', error);
			throw error;
		}
	}

	// Processar falha no pagamento
	private static async handlePaymentFailed(orderData: any) {
		try {
			const orderId = orderData.id;
			console.log(`Processando falha de pagamento: ${orderId}`);

			// Atualizar status da transação
			await prisma.transaction.updateMany({
				where: { orderId },
				data: { status: 'payment_failed' }
			});

		} catch (error) {
			console.error('Erro ao processar falha de pagamento:', error);
			throw error;
		}
	}

	// Processar pedido cancelado
	private static async handleOrderCanceled(orderData: any) {
		try {
			const orderId = orderData.id;
			console.log(`Processando cancelamento: ${orderId}`);

			// Buscar transação
			const transaction = await prisma.transaction.findFirst({
				where: { orderId },
				include: {
					trainer: { include: { wallet: true } }
				}
			});

			if (!transaction) return;

			// Se o pagamento já foi processado, fazer estorno
			if (transaction.status === 'paid' && transaction.trainer?.wallet && transaction.trainerId) {
				// Calcular valor do estorno (valor que foi creditado ao treinador)
				const refundAmount = await WebhookController.calculateTrainerAmount(orderId);

				if (refundAmount > 0) {
					// Debitar da carteira do treinador
					await RecipientController.updateTrainerBalance(
						transaction.trainerId,
						refundAmount,
						'decrement',
						`Estorno - Pedido ${orderId}`
					);

					// Registrar transação de estorno
					await RecipientController.recordDebitTransaction(
						transaction.trainerId,
						refundAmount,
						orderId,
						'REFUND',
						`Estorno - Pedido ${orderId}`
					);
				}
			}

			// Atualizar status da transação original
			await prisma.transaction.updateMany({
				where: { orderId },
				data: { status: 'canceled' }
			});

		} catch (error) {
			console.error('Erro ao processar cancelamento:', error);
			throw error;
		}
	}

	// Processar cobrança paga (backup para casos específicos)
	private static async handleChargePaid(chargeData: any) {
		try {
			console.log(`Cobrança paga: ${chargeData.id}`);

			// Buscar o pedido relacionado
			if (chargeData.order_id) {
				await WebhookController.handleOrderPaid({ id: chargeData.order_id });
			}

		} catch (error) {
			console.error('Erro ao processar cobrança paga:', error);
			throw error;
		}
	}

	// Função auxiliar para calcular valor do treinador baseado no split
	private static async calculateTrainerAmount(orderId: string): Promise<number> {
		try {
			// Buscar transações relacionadas ao pedido
			const transactions = await prisma.transaction.findMany({
				where: {
					orderId,
					type: 'PAYMENT',
					status: 'paid'
				}
			});

			// Somar valores creditados ao treinador
			return transactions.reduce((total, transaction) => {
				if (transaction.trainerId && transaction.amount > 0) {
					// Calcular valor líquido (descontando taxa da plataforma)
					const platformFee = Math.floor(transaction.amount * 0.05);
					return total + (transaction.amount - platformFee);
				}
				return total;
			}, 0);

		} catch (error) {
			console.error('Erro ao calcular valor do treinador:', error);
			return 0;
		}
	}
}

// Rota para o webhook (adicione ao seu arquivo de rotas)
/*
// routes/webhook.ts
import express from 'express';
import { WebhookController } from '../controllers/WebhookController';

const router = express.Router();

// Middleware para parsing raw do body (necessário para validação de assinatura)
router.use('/pagarme', express.raw({ type: 'application/json' }));

// Endpoint do webhook
router.post('/pagarme', WebhookController.handlePagarmeWebhook);

export default router;
*/

// Configuração de ambiente necessária (.env)
/*
PAGARME_WEBHOOK_SECRET=sua_chave_secreta_do_webhook
PLATAFORMA_WALLET_ID=seu_recipient_id_da_plataforma
*/