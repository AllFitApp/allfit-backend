import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function handleOrderPaid(orderData: any) {
	try {
		console.log('Processando pagamento aprovado:', orderData.id);

		// Atualiza status da transação
		await prisma.transaction.updateMany({
			where: { orderId: orderData.id },
			data: { status: 'PAID' },
		});

		// Atualiza saldo da carteira se houver split
		if (orderData.split && orderData.split.length > 0) {
			for (const split of orderData.split) {
				const wallet = await prisma.wallet.findUnique({
					where: { pagarmeWalletId: split.recipient_id },
				});

				if (wallet) {
					await prisma.wallet.update({
						where: { id: wallet.id },
						data: {
							balance: { increment: split.amount },
							lastSynced: new Date(),
						},
					});
					console.log(`Saldo atualizado para wallet ${wallet.id}: +${split.amount}`);
				}
			}
		}
	} catch (error) {
		console.error('Erro ao processar pagamento aprovado:', error);
	}
}

export async function handleOrderFailed(orderData: any) {
	try {
		console.log('Processando pagamento falhado:', orderData.id);

		// Atualiza status da transação
		await prisma.transaction.updateMany({
			where: { orderId: orderData.id },
			data: { status: 'FAILED' },
		});
	} catch (error) {
		console.error('Erro ao processar pagamento falhado:', error);
	}
}
export async function handleSubscriptionCreated(subscriptionData: any) {
	try {
		console.log('Processando assinatura criada:', subscriptionData.id);

		// Atualiza status da assinatura
		await prisma.subscription.updateMany({
			where: { pagarmeSubscriptionId: subscriptionData.id },
			data: { status: 'ACTIVE' },
		});
	} catch (error) {
		console.error('Erro ao processar criação de assinatura:', error);
	}
}

export async function handleSubscriptionChargePaid(chargeData: any) {
	try {
		console.log('Processando cobrança de assinatura paga:', chargeData.id);

		// Busca a assinatura
		const subscription = await prisma.subscription.findUnique({
			where: { pagarmeSubscriptionId: chargeData.subscription.id },
			include: { trainer: { include: { wallet: true } } },
		});

		if (!subscription) {
			console.error('Assinatura não encontrada:', chargeData.subscription.id);
			return;
		}

		// Registra a transação da cobrança
		await prisma.transaction.create({
			data: {
				userId: subscription.userId,
				trainerId: subscription.trainerId,
				orderId: chargeData.id,
				amount: chargeData.amount,
				type: 'PAYMENT',
				status: 'PAID',
				paymentMethod: chargeData.payment_method,
				description: `Cobrança mensal da assinatura`,
			},
		});

		// Atualiza saldo do treinador se houver split
		if (chargeData.split && chargeData.split.length > 0 && subscription.trainer.wallet) {
			const trainerSplit = chargeData.split.find(
				(s: any) => s.recipient_id === subscription?.trainer?.wallet?.pagarmeWalletId
			);

			if (trainerSplit) {
				await prisma.wallet.update({
					where: { id: subscription.trainer.wallet.id },
					data: {
						balance: { increment: trainerSplit.amount },
						lastSynced: new Date(),
					},
				});
			}
		}
	} catch (error) {
		console.error('Erro ao processar cobrança de assinatura paga:', error);
	}
}

export async function handleSubscriptionChargeFailed(chargeData: any) {
	try {
		console.log('Processando cobrança de assinatura falhada:', chargeData.id);

		// Busca a assinatura
		const subscription = await prisma.subscription.findUnique({
			where: { pagarmeSubscriptionId: chargeData.subscription.id },
		});

		if (!subscription) {
			console.error('Assinatura não encontrada:', chargeData.subscription.id);
			return;
		}

		// Registra a transação da cobrança falhada
		await prisma.transaction.create({
			data: {
				userId: subscription.userId,
				trainerId: subscription.trainerId,
				orderId: chargeData.id,
				amount: chargeData.amount,
				type: 'PAYMENT',
				status: 'FAILED',
				paymentMethod: chargeData.payment_method,
				description: `Cobrança mensal da assinatura - Falha`,
			},
		});

		// Aqui você pode implementar lógica para lidar com cobranças falhadas
		// Por exemplo: notificar o usuário, suspender a assinatura após X tentativas, etc.
	} catch (error) {
		console.error('Erro ao processar cobrança de assinatura falhada:', error);
	}
}

export async function handleTransferPaid(transferData: any) {
	try {
		console.log('Processando transferência paga:', transferData.id);

		// Atualiza status da transação
		await prisma.transaction.updateMany({
			where: { transferId: transferData.id },
			data: { status: 'PAID' },
		});

		// Busca a transação para obter o userId
		const transaction = await prisma.transaction.findFirst({
			where: { transferId: transferData.id },
		});

		if (transaction && transaction.userId) {
			// Atualiza o saldo da carteira (decrementa o valor transferido)
			await prisma.wallet.update({
				where: { userId: transaction.userId },
				data: {
					balance: { decrement: transferData.amount },
					lastSynced: new Date(),
				},
			});
			console.log(`Saldo decrementado para usuário ${transaction.userId}: -${transferData.amount}`);
		}
	} catch (error) {
		console.error('Erro ao processar transferência paga:', error);
	}
}

export async function handleTransferFailed(transferData: any) {
	try {
		console.log('Processando transferência falhada:', transferData.id);

		// Atualiza status da transação
		await prisma.transaction.updateMany({
			where: { transferId: transferData.id },
			data: { status: 'FAILED' },
		});

		// Busca a transação para obter o userId
		const transaction = await prisma.transaction.findFirst({
			where: { transferId: transferData.id },
		});

		if (transaction && transaction.userId) {
			// Como a transferência falhou, não precisamos decrementar o saldo
			// Apenas garantimos que está sincronizado
			await prisma.wallet.update({
				where: { userId: transaction.userId },
				data: { lastSynced: new Date() },
			});
		}
	} catch (error) {
		console.error('Erro ao processar transferência falhada:', error);
	}
}
