// infra/controller/PagarmeController.ts
import pagarmeApi from '@/lib/axios';
import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';

const prisma = new PrismaClient();

export default class PaymentController {
	/**
	 * Criar plano mensal (features é um array flexível)
	 * Por enquanto, apenas planos mensais, pré-pago com cartão de crédito
	 * Ex:
	 * [{
			"id": "aulas_mensais",
			"name": "Aulas mensais",
			"description": "8 aulas por mês",
			"value": "8",
			"unit": "aulas",
			"icon": "calendar",
			"highlighted": true
      }]
	 */
	static async createMonthlyModel(req: Request, res: Response) {
		try {
			const { userId, name, description, price, features } = req.body;

			const user = await prisma.user.findUnique({
				where: { id: userId },
				select: { role: true, username: true, wallet: { select: { pagarmeWalletId: true } } },
			});

			if (!user || user.role.toUpperCase() !== 'TRAINER') {
				res.status(400).json({ message: 'Usuário deve ser um treinador.' });
				return;
			}
			if (!user.wallet?.pagarmeWalletId) {
				res.status(405).json({ message: 'Você deve ter uma carteira para continuar.' });
				return;
			}
			if (typeof price !== 'number') {
				res.status(400).json({ message: 'O valor do plano deve ser um número.' });
				return;
			}
			if (price <= 1000) {
				res.status(400).json({ message: 'O valor do plano deve ser maior que R$ 10,00.' });
				return;
			}

			const payload = {
				interval: 'month',
				interval_count: 1,
				pricing_scheme: {
					scheme_type: 'unit',
					price: price,
				},
				quantity: 1,
				name,
				currency: 'BRL',
				billing_type: 'prepaid',
				payment_methods: ['credit_card'],
				metadata: { recipientId: user.wallet.pagarmeWalletId },
			};
			const { data, status, statusText } = await pagarmeApi.post('/plans', payload);

			if (data?.status !== 'active') {
				console.log('Erro ao criar plano:', statusText);
				res.status(500).json({ message: 'Erro ao criar plano.' });
				return;
			}

			const plan = await prisma.plan.create({
				data: {
					trainerId: userId,
					trainerUsername: user.username,
					pagarmePlanId: data.id,
					name,
					description,
					price: price,
					features,
					isActive: true,
				},
			});

			res.status(201).json({
				message: 'Plano criado com sucesso',
				plan: {
					id: plan.id,
					name: plan.name,
					description: plan.description,
					price: plan.price,
					features: plan.features,
					isActive: plan.isActive,
				},
			});
		} catch (error: any) {
			console.error('Erro ao criar plano:', error.response?.data || error.message);
			res.status(500).json({ message: 'Erro ao criar plano.' });
		}
	}
	/**
	 * Listar planos do treinador
	 */
	static async getTrainerPlans(req: Request, res: Response) {
		try {
			const { trainerId } = req.params;

			const plans = await prisma.plan.findMany({
				where: {
					trainerId,
					isActive: true,
				},
				omit: {
					trainerId: true,
					trainerUsername: true,
				},
				orderBy: { createdAt: 'desc' },
			});

			res.json({ plans: plans });
		} catch (error: any) {
			console.error('Erro ao buscar planos:', error.response?.data || error.message);
			res.status(500).json({ message: 'Erro ao buscar planos.' });
		}
	}
	/**
	 * Criar assinatura mensal
	 */
	static async payMonthlySubscription(req: Request, res: Response) {
		try {
			const { studentId, trainerId, cardId, planId } = req.body;

			// Busca dados do treinador
			const trainer = await prisma.user.findUnique({
				where: { id: trainerId },
				select: {
					name: true,
					role: true,
					wallet: { select: { pagarmeWalletId: true } },
				},
			});

			if (!trainer || trainer.role !== 'TRAINER') {
				res.status(404).json({ message: 'Treinador não encontrado.' });
				return;
			}

			if (!trainer.wallet) {
				res.status(400).json({ message: 'Treinador deve ter uma carteira.' });
				return;
			}

			// Busca o plano específico
			const plan = await prisma.plan.findUnique({
				where: { id: planId },
				select: { price: true, name: true, trainerId: true },
			});

			if (!plan || plan.trainerId !== trainerId) {
				res.status(404).json({ message: 'Plano não encontrado.' });
				return;
			}

			// Verifica se aluno já tem assinatura ativa com este treinador
			const existingSubscription = await prisma.subscription.findFirst({
				where: {
					userId: studentId,
					trainerId,
					status: 'ACTIVE',
				},
			});

			if (existingSubscription) {
				res.status(400).json({ message: 'Aluno já possui assinatura ativa com este treinador.' });
				return;
			}

			// Busca dados do aluno
			const student = await prisma.user.findUnique({
				where: { id: studentId },
				select: { pagarmeCustomerId: true },
			});

			if (!student?.pagarmeCustomerId) {
				res.status(400).json({ message: 'Aluno deve ter um customer ID.' });
				return;
			}

			// Busca cartão salvo
			const savedCard = await prisma.savedCard.findUnique({
				where: { id: cardId },
			});

			if (!savedCard || savedCard.userId !== studentId) {
				res.status(404).json({ message: 'Cartão não encontrado.' });
				return;
			}

			const amount = plan.price;
			const platformFee = Math.floor(amount * 0.1); // 10% para plataforma
			const trainerAmount = amount - platformFee;

			// Cria assinatura no Pagar.me V5
			const subscriptionPayload = {
				customer_id: student.pagarmeCustomerId,
				payment_method: 'credit_card',
				card_id: savedCard.pagarmeCardId,
				items: [
					{
						description: `${plan.name} - ${trainer.name}`,
						quantity: 1,
						pricing_scheme: {
							price: amount,
							scheme_type: 'unit',
						},
					},
				],
				interval: 'month',
				interval_count: 1,
				billing_type: 'prepaid',
				split: [
					{
						recipient_id: trainer.wallet.pagarmeWalletId,
						amount: trainerAmount,
						type: 'flat',
					},
				],
			};

			const { data: subscription } = await pagarmeApi.post('/subscriptions', subscriptionPayload);

			// Salva assinatura localmente
			const localSubscription = await prisma.subscription.create({
				data: {
					userId: studentId,
					trainerId,
					planId,
					pagarmeSubscriptionId: subscription.id,
					status: 'ACTIVE',
					planPrice: amount,
					startDate: new Date(),
				},
			});

			res.status(201).json({
				message: 'Assinatura criada com sucesso',
				subscription: {
					id: localSubscription.id,
					status: localSubscription.status,
					planPrice: localSubscription.planPrice,
					planPriceFormatted: (localSubscription.planPrice / 100).toFixed(2),
				},
			});
		} catch (error: any) {
			console.error('Erro na assinatura:', error.response?.data || error.message);
			res.status(500).json({ message: 'Falha na criação da assinatura.' });
		}
	}
	/**
	 * Listar assinaturas de um aluno
	 */
	static async listSubscriptions(req: Request, res: Response) {
		try {
			const { userId } = req.params;
			const subscriptions = await prisma.subscription.findMany({
				where: { userId },
				orderBy: { createdAt: 'desc' },
			});
			res.json({ subscriptions });
		} catch (error: any) {
			console.error('Erro ao buscar assinaturas:', error.response?.data || error.message);
			res.status(500).json({ message: 'Erro ao buscar assinaturas.' });
		}
	}
	/**
	 * Cancelar assinatura de aluno
	 */
	static async cancelSubscription(req: Request, res: Response) {
		const { userId, subscriptionId } = req.params;

		if (!subscriptionId) {
			return res.status(400).json({
				error: 'ID da assinatura é obrigatório',
			});
		}

		try {
			// Buscar a assinatura no banco local
			const subscription = await prisma.subscription.findUnique({
				where: { id: subscriptionId },
				include: {
					user: true,
					trainer: true,
					plan: true,
				},
			});

			if (!subscription) {
				return res.status(404).json({
					error: 'Assinatura não encontrada',
				});
			}

			// Verificar se o usuário tem permissão para cancelar
			if (subscription.userId !== userId) {
				return res.status(403).json({
					error: 'Você não tem permissão para cancelar esta assinatura',
				});
			}

			// Verificar se a assinatura já está cancelada
			if (subscription.status === 'CANCELLED') {
				return res.status(400).json({
					error: 'Assinatura já está cancelada',
				});
			}

			// Cancelar assinatura na Pagar.me
			const { data, status, statusText } = await pagarmeApi.delete(
				`/subscriptions/${subscription.pagarmeSubscriptionId}`
			);

			if (!data) {
				const errorData = await data.json();
				res.status(500).json(`Erro na Pagar.me: ${errorData.message || 'Erro desconhecido'}`);
				return;
			}

			// Atualizar status no banco local
			const updatedSubscription = await prisma.subscription.update({
				where: { id: subscriptionId },
				data: {
					status: 'CANCELLED',
					endDate: new Date(),
					updatedAt: new Date(),
				},
			});

			return res.status(200).json({
				message: 'Assinatura cancelada com sucesso',
				subscription: {
					id: updatedSubscription.id,
					status: updatedSubscription.status,
					endDate: updatedSubscription.endDate,
					planName: subscription.plan.name,
				},
			});
		} catch (error) {
			console.error('Erro ao cancelar assinatura:', error);

			// Rollback: tentar reverter mudanças no banco se houver erro
			try {
				await prisma.subscription.update({
					where: { id: subscriptionId },
					data: {
						status: 'ACTIVE', // Reverter para status anterior
						endDate: null,
						updatedAt: new Date(),
					},
				});
			} catch (rollbackError) {
				console.error('Erro no rollback:', rollbackError);
			}

			return res.status(500).json({
				error: 'Erro interno do servidor ao cancelar assinatura',
			});
		}
	}
	static async deleteSubscriptionModel(req: Request, res: Response) {
		try {
			const { planId } = req.params;
			await pagarmeApi.delete(`/plans/${planId}`);
			await prisma.plan.delete({ where: { id: planId } });
			res.json({ message: 'Assinatura excluida com sucesso.' });
		} catch (error: any) {
			console.error('Erro ao excluir assinatura:', error.message);
			res.status(500).json({ message: 'Erro ao excluir assinatura.' });
		}
	}

	// ==== Aulas avulsas ====
	/**
	 * Definir aulas avulsas
	 */
	static async createSingleWorkoutModel(req: Request, res: Response) {
		try {
			const { userId, name, description, price } = req.body;
			if (!userId || !name || !description || !price) {
				res.status(400).json({ message: 'Todos os campos obrigatórios devem estar preenchidos.' });
				return;
			}
			// Valida treinador
			const user = await prisma.user.findUnique({
				where: { id: userId },
				select: { role: true, username: true },
			});

			if (!user || user.role !== 'TRAINER') {
				res.status(400).json({ message: 'Usuário deve ser um treinador.' });
				return;
			}

			const priceInCents = Math.floor(Number(price) * 100);
			console.log(priceInCents);
			if (priceInCents <= 1000) {
				res.status(400).json({ message: 'O valor da aula avulsa deve ser maior que R$ 10,00.' });
				return;
			}

			const workout = await prisma.singleWorkout.upsert({
				where: { trainerId: userId },
				create: {
					trainerId: userId,
					trainerUsername: user.username,
					name,
					description,
					price: priceInCents,
				},
				update: {
					name,
					description,
					price: priceInCents,
				},
			});

			res.status(201).json({
				message: 'Aula avulsa criada com sucesso.',
				workout,
				priceFormatted: (workout.price / 100).toFixed(2),
			});
		} catch (error: any) {
			console.error('Erro ao criar aula avulsa:', error.message);
			res.status(500).json({ message: 'Erro ao criar aula avulsa.' });
		}
	}
	/**
	 * Atualizar aula avulsa
	 */
	static async updateSingleWorkout(req: Request, res: Response) {
		try {
			const { workoutId } = req.params;
			const { name, description, price, isActive } = req.body;

			const existing = await prisma.singleWorkout.findUnique({
				where: { id: Number(workoutId) },
			});

			if (!existing) {
				res.status(404).json({ message: 'Aula avulsa não encontrada.' });
				return;
			}

			const updated = await prisma.singleWorkout.update({
				where: { id: Number(workoutId) },
				data: {
					name,
					description,
					price: typeof price === 'number' ? Math.floor(price * 100) : undefined,
					isActive,
				},
			});

			res.json({
				message: 'Aula avulsa atualizada com sucesso.',
				workout: updated,
				priceFormatted: (updated.price / 100).toFixed(2),
			});
		} catch (error: any) {
			console.error('Erro ao atualizar aula avulsa:', error.message);
			res.status(500).json({ message: 'Erro ao atualizar aula avulsa.' });
		}
	}
	/**
	 * Buscar aula avulsa
	 */
	static async getSingleWorkout(req: Request, res: Response) {
		try {
			const { username } = req.params;
			console.log(username);
			const existing = await prisma.singleWorkout.findFirst({
				where: { trainerUsername: username },

				select: {
					name: true,
					description: true,
					price: true,
				},
			});

			if (!existing) {
				res.status(404).json({ message: 'Aula avulsa não encontrada.' });
				return;
			}

			res.json(existing);
		} catch (error: any) {
			console.error('Erro ao atualizar aula avulsa:', error.message);
			res.status(500).json({ message: 'Erro ao atualizar aula avulsa.' });
		}
	}
	/**
	 * Definir aulas avulsas
	 */
	static async deleteSingleWorkout(req: Request, res: Response) {
		try {
			const { userId } = req.body;
			await prisma.singleWorkout.delete({ where: { trainerId: userId } });
			res.json({ message: 'Aula avulsa excluida com sucesso.' });
		} catch (error: any) {
			console.error('Erro ao excluir aula avulsa:', error.message);
			res.status(500).json({ message: 'Erro ao excluir aula avulsa.' });
		}
	}
	/**
	 * Pagamento de aula avulsa (payOneTimeWorkout)
	 * Do valor da aula será deduzido a taxa da plataforma
	 */
	static async paySingleWorkout(req: Request, res: Response) {
		try {
			const {
				studentId,
				trainerId,
				classId,
				cardId,
				paymentMethod = 'credit_card', // valor padrão
				description,
			} = req.body;
			const tax = 0.1; // taxa da plataforma: 10%

			// 1) Busca detalhes da aula avulsa
			const singleClass = await prisma.singleWorkout.findUnique({
				where: { id: Number(classId) },
				select: { price: true, id: true },
			});
			if (!singleClass) {
				res.status(404).json({ message: 'Aula avulsa não encontrada.' });
				return;
			}

			// 2) Verifica treinador e carteira
			const trainer = await prisma.user.findUnique({
				where: { id: trainerId },
				select: { role: true, wallet: { select: { pagarmeWalletId: true } } },
			});
			if (!trainer || trainer.role !== 'TRAINER') {
				res.status(404).json({ message: 'Treinador não encontrado.' });
				return;
			}
			if (!trainer.wallet) {
				res.status(400).json({ message: 'Treinador deve ter uma carteira.' });
				return;
			}

			// 3) Verifica aluno e seu customer ID
			const student = await prisma.user.findUnique({
				where: { id: studentId },
				select: { pagarmeCustomerId: true, cpf: true, name: true },
			});
			if (!student?.pagarmeCustomerId) {
				res.status(400).json({ message: 'Aluno deve ter um customer ID.' });
				return;
			}

			// 4) Verifica cartão salvo
			const savedCard = await prisma.savedCard.findUnique({ where: { id: Number(cardId) } });
			if (!savedCard || savedCard.userId !== studentId) {
				res.status(404).json({ message: 'Cartão não encontrado.' });
				return;
			}

			// 5) Calcula valores (valor da aula, taxa da plataforma, valor do treinador)
			const amount = singleClass.price;
			const platformFee = Math.floor(amount * tax);
			const trainerAmount = amount - platformFee;

			let payments: any[] = [];

			switch (paymentMethod) {
				case 'credit_card': {
					console.log('tipo credit_card');
					if (!cardId) {
						console.log('Moiô');
						res.status(400).json({ message: 'É necessário fornecer um cartão salvo.' });

						return;
					}

					const savedCard = await prisma.savedCard.findUnique({ where: { id: cardId } });
					if (!savedCard || savedCard.userId !== studentId) {
						res.status(404).json({ message: 'Cartão não encontrado.' });
						return;
					}

					payments = [
						{
							payment_method: 'credit_card',
							credit_card: {
								recurrence: false,
								installments: 1,
								statement_descriptor: 'ALLFIT',
								card_id: savedCard.pagarmeCardId,
							},
						},
					];
					break;
				}

				case 'pix': {
					payments = [
						{
							payment_method: 'pix',
						},
					];
					break;
				}

				case 'debit_card': {
					if (!cardId) {
						res.status(400).json({ message: 'É necessário fornecer um cartão salvo.' });
						return;
					}

					const savedCard = await prisma.savedCard.findUnique({ where: { id: cardId } });
					if (!savedCard || savedCard.userId !== studentId) {
						res.status(404).json({ message: 'Cartão não encontrado.' });
						return;
					}

					payments = [
						{
							payment_method: 'debit_card',
							debit_card: {
								card_id: savedCard.pagarmeCardId,
							},
						},
					];
					break;
				}

				default:
					res.status(400).json({ message: 'Método de pagamento inválido.' });
					return;
			}

			const payload = {
				customer_id: student.pagarmeCustomerId,
				items: [
					{
						code: singleClass.id.toString(),
						amount: amount,
						description: description,
						quantity: 1,
					},
				],
				payments,
				split: [
					{
						recipient_id: trainer.wallet.pagarmeWalletId,
						amount: trainerAmount, // valor líquido do treinador (ex: 9000)
						type: 'flat',
					},
					{
						recipient_id: process.env.PLATAFORMA_WALLET_ID!, // substitua pelo seu ID fixo
						amount: platformFee, // valor da taxa da plataforma (ex: 1000)
						type: 'flat',
					},
				],
			};

			const { data: order, status, statusText } = await pagarmeApi.post('/orders', payload);

			console.log('last_transaction:', JSON.stringify(order?.charges?.[0]?.last_transaction, null, 2));

			// 7) Registra a transação
			await prisma.transaction.create({
				data: {
					userId: studentId,
					trainerId,
					orderId: order.id,
					amount,
					type: 'PAYMENT',
					status: order.status,
					paymentMethod,
					description,
				},
			});

			res.status(200).json({
				message: 'Pagamento processado',
				order: { id: order.id, status: order.status, amount: order.amount },
			});
		} catch (error: any) {
			console.error('Erro no pagamento:', error.response?.data || error.message);
			console.log('Erro geral: ', error);
			res.status(500).json({ message: 'Falha no pagamento avulso.' });
			return;
		}
	}

	// ==== Controler de transações ====
	/**
	 * Listar transações
	 */
	static async getTransactions(req: Request, res: Response) {
		try {
			const { userId } = req.params;
			const { page = 1, limit = 10 } = req.query;

			const transactions = await prisma.transaction.findMany({
				where: { trainerId: userId }, // No banco de dados, o trainerId que corresponde ao treinador e o userId, o aluno
				include: {
					user: {
						select: {
							name: true,
							cpf: true,
							email: true,
						},
					},
					trainer: {
						select: {
							name: true,
							cpf: true,
							email: true,
						},
					},
				},
				orderBy: { createdAt: 'desc' },
				take: Number(limit),
				skip: (Number(page) - 1) * Number(limit),
			});

			const total = await prisma.transaction.count({
				where: { trainerId: userId },
			});

			// Formatar os dados conforme solicitado
			const formattedTransactions = transactions.map((transaction) => {
				// Determinar se é entrada ou saída baseado no tipo de transação
				let status = 'entrada';
				if (transaction.type === 'WITHDRAWAL') {
					status = 'saída';
				} else if (transaction.type === 'REFUND') {
					status = 'estorno';
				} else if (transaction.type === 'FEE') {
					status = 'taxa';
				}

				return {
					date: transaction.createdAt.toLocaleDateString('pt-BR'),
					name: transaction?.user?.name || 'Nome não informado',
					cpf: transaction?.user?.cpf || 'CPF não informado',
					email: transaction?.user?.email || 'Email não informado',
					amount: transaction.amount, // converter de centavos para reais
					status: status,
				};
			});

			res.json({
				transactions: formattedTransactions,
				pagination: {
					page: Number(page),
					limit: Number(limit),
					total,
					totalPages: Math.ceil(total / Number(limit)),
				},
			});
		} catch (error: any) {
			console.error('Erro ao buscar transações:', error.response?.data || error.message);
			res.status(500).json({ message: 'Erro ao buscar transações.' });
		}
	}
}
