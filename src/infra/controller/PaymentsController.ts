// infra/controller/PagarmeController.ts
import pagarmeApi from '@/lib/axios';
import { PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';
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

			if (!user) {
				res.status(404).json({ message: 'Usuário não encontrado.' });
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
			const { username } = req.params;

			const plans = await prisma.plan.findMany({
				where: {
					trainerUsername: username,
					isActive: true,
				},
				omit: {
					trainerId: true,
					// trainerUsername: true,
				},
				orderBy: { createdAt: 'desc' },
			});

			res.json(plans);
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
				where: { id: Number(cardId) },
			});

			if (!savedCard || savedCard.userId !== studentId) {
				res.status(404).json({ message: 'Cartão não encontrado.' });
				return;
			}

			const amount = plan.price;
			const platformFee = Math.floor(amount * 0.05); // 10% para plataforma
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
					{
						recipient_id: process.env.PLATFORM_WALLET_ID,
						amount: platformFee,
						type: 'flat',
					}
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
					startDate: dayjs().toDate(),
				},
			});

			if (subscription?.status !== 'active') {
				res.status(400).json({ message: 'Assinatura falhou.' });
			}
			await prisma.wallet.update({
				where: { userId: trainerId },
				data: {
					balance: {
						increment: trainerAmount
					}
				}
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
				where: { OR: [{ userId }, { trainerId: userId }] },
				orderBy: { createdAt: 'desc' },
				include: {
					user: {
						omit: {
							password: true,
							pagarmeCustomerId: true,
							role: true,
						}
					}
				}
			});
			const formattedTransactions = subscriptions.filter((subscription) => subscription.status === 'ACTIVE').map((subscription) => ({
				date: subscription.startDate,
				name: subscription.user.name,
				cpf: subscription.user.cpf,
				email: subscription.user.email,
				amount: subscription.planPrice,
				status: subscription.status,
				user: subscription.user
			}));

			res.json(formattedTransactions);
		} catch (error: any) {
			console.error('Erro ao buscar assinaturas:', error.response?.data || error.message);
			res.status(500).json({ message: 'Erro ao buscar assinaturas.' });
		}
	}
	/**
	 * Listar assinaturas do treinador
	 */
	static async getTrainerStudents(req: Request, res: Response) {
    try {
        const { trainerId } = req.params;

        // Buscar aulas avulsas (appointments com singleWorkout)
        const singleWorkoutAppointments = await prisma.appointment.findMany({
            where: { 
                trainerId,
                singleWorkoutId: { not: null }
            },
            include: {
                student: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        email: true,
                        profile: {
                            select: {
                                avatar: true
                            }
                        }
                    }
                },
                singleWorkout: {
                    select: {
                        name: true,
                        price: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Buscar assinaturas ativas
        const activeSubscriptions = await prisma.subscription.findMany({
            where: { 
                trainerId,
                status: 'ACTIVE'
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        email: true,
                        profile: {
                            select: {
                                avatar: true
                            }
                        }
                    }
                },
                plan: {
                    select: {
                        name: true,
                        price: true
                    }
                },
                appointments: {
                    where: {
                        date: { gte: new Date() }, // Próximas aulas
                        status: { in: ['pending', 'accepted'] }
                    },
                    orderBy: { date: 'asc' },
                    take: 1
                }
            }
        });

        // Buscar assinaturas canceladas/expiradas (desistentes)
        const canceledSubscriptions = await prisma.subscription.findMany({
            where: { 
                trainerId,
                status: { in: ['CANCELLED', 'EXPIRED'] }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        email: true,
                        profile: {
                            select: {
                                avatar: true
                            }
                        }
                    }
                },
                plan: {
                    select: {
                        name: true,
                        price: true
                    }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        // Formatação das aulas avulsas
        const avulsasData = {
            todos: singleWorkoutAppointments.map(appointment => ({
                id: appointment.id,
                studentId: appointment.student.id,
                name: appointment.student.name,
                username: appointment.student.username,
                email: appointment.student.email,
                photo: appointment.student.profile?.avatar || '',
                paymentDate: appointment.paidAt,
                scheduledDate: appointment.date,
                completedDate: appointment.completedAt,
                classesCount: 1, // Aula avulsa sempre é 1
                status: appointment.status,
                paymentStatus: appointment.paymentStatus,
                paid: appointment.paymentStatus === 'paid',
                workoutName: appointment.singleWorkout?.name,
                price: appointment.singleWorkout?.price
            })),
            
            // Filtrar por status específicos
            pendentes: singleWorkoutAppointments
                .filter(apt => apt.status === 'pending')
                .map(appointment => ({
                    id: appointment.id,
                    studentId: appointment.student.id,
                    name: appointment.student.name,
                    username: appointment.student.username,
                    email: appointment.student.email,
                    photo: appointment.student.profile?.avatar || '',
                    paymentDate: appointment.paidAt,
                    classesCount: 1,
                    status: 'Agendamento Pendente'
                })),
                
            finalizadas: singleWorkoutAppointments
                .filter(apt => apt.status === 'completed')
                .map(appointment => ({
                    id: appointment.id,
                    studentId: appointment.student.id,
                    name: appointment.student.name,
                    username: appointment.student.username,
                    email: appointment.student.email,
                    photo: appointment.student.profile?.avatar || '',
                    completedDate: appointment.completedAt,
                    classesCount: 1,
                    status: 'Concluído'
                })),
                
            marcadas: singleWorkoutAppointments
                .filter(apt => apt.status === 'accepted' && new Date(apt.date) > new Date())
                .map(appointment => ({
                    id: appointment.id,
                    studentId: appointment.student.id,
                    name: appointment.student.name,
                    username: appointment.student.username,
                    email: appointment.student.email,
                    photo: appointment.student.profile?.avatar || '',
                    scheduledDate: appointment.date,
                    classesCount: 1,
                    status: 'Agendado'
                }))
        };

        // Formatação das assinaturas
        const assinaturasData = {
            aulasAgendadas: activeSubscriptions
                .filter(sub => sub.appointments.length > 0)
                .map(subscription => ({
                    id: subscription.id,
                    studentId: subscription.user.id,
                    name: subscription.user.name,
                    username: subscription.user.username,
                    email: subscription.user.email,
                    photo: subscription.user.profile?.avatar || '',
                    plan: subscription.plan.name,
                    planPrice: subscription.planPrice,
                    paymentStatus: subscription.status === 'ACTIVE' ? 'Em dia' : 'Atrasado',
                    paymentMethod: 'Não informado', // Seria necessário buscar da última transação
                    nextClass: subscription.appointments[0]?.date,
                    subscriptionDate: subscription.startDate
                })),
                
            semAgendamento: activeSubscriptions
                .filter(sub => sub.appointments.length === 0)
                .map(subscription => ({
                    id: subscription.id,
                    studentId: subscription.user.id,
                    name: subscription.user.name,
                    username: subscription.user.username,
                    email: subscription.user.email,
                    photo: subscription.user.profile?.avatar || '',
                    plan: subscription.plan.name,
                    planPrice: subscription.planPrice,
                    paymentStatus: subscription.status === 'ACTIVE' ? 'Em dia' : 'Atrasado',
                    paymentMethod: 'Não informado', // Seria necessário buscar da última transação
                    subscriptionDate: subscription.startDate
                })),
                
            desistentes: canceledSubscriptions.map(subscription => ({
                id: subscription.id,
                studentId: subscription.user.id,
                name: subscription.user.name,
                username: subscription.user.username,
                email: subscription.user.email,
                photo: subscription.user.profile?.avatar || '',
                plan: subscription.plan.name,
                planPrice: subscription.planPrice,
                cancelDate: subscription.updatedAt, // Data da última atualização (cancelamento)
                subscriptionDate: subscription.startDate
            }))
        };

        // Contar totais para cada categoria
        const summary = {
            totalSingleWorkouts: singleWorkoutAppointments.length,
            totalActiveSubscriptions: activeSubscriptions.length,
            totalCanceledSubscriptions: canceledSubscriptions.length,
            totalStudents: new Set([
                ...singleWorkoutAppointments.map(apt => apt.student.id),
                ...activeSubscriptions.map(sub => sub.user.id)
            ]).size
        };

        const response = {
            summary,
            avulsas: avulsasData,
            assinaturas: assinaturasData
        };

        res.json(response);
        
    } catch (error: any) {
        console.error('Erro ao buscar alunos do trainer:', error);
        res.status(500).json({ 
            message: 'Erro ao buscar alunos do trainer.',
            error: error.message 
        });
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
	/**
	 * Pagamento de aula avulsa (atualizado)
	 */
	static async paySingleWorkout(req: Request, res: Response) {
		try {
			const {
				studentId,
				trainerId,
				workoutId,
				cardId,
				paymentMethod = 'credit_card',
				description,
			} = req.body;
			const tax = 0.05; // taxa da plataforma: 10%
			console.log(`studentId: ${studentId}, trainerId: ${trainerId}, workoutId: ${workoutId}, cardId: ${cardId}, paymentMethod: ${paymentMethod}`);
			// 1) Busca detalhes da aula avulsa
			const singleWorkout = await prisma.singleWorkout.findUnique({
				where: { id: parseInt(workoutId) },
				select: {
					price: true,
					id: true,
					name: true,
					trainerId: true,
					isActive: true
				},
			});

			if (!singleWorkout) {
				res.status(404).json({ message: 'Aula avulsa não encontrada.' });
				return;
			}

			if (!singleWorkout.isActive) {
				res.status(400).json({ message: 'Esta aula avulsa não está disponível.' });
				return;
			}

			// Verifica se o treinador da aula corresponde ao informado
			if (singleWorkout.trainerId !== trainerId) {
				res.status(400).json({ message: 'Treinador não corresponde à aula selecionada.' });
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

			// 4) Verifica cartão salvo (se necessário)
			let savedCard = null;
			if (['credit_card', 'debit_card'].includes(paymentMethod)) {
				if (!cardId) {
					res.status(400).json({ message: 'É necessário fornecer um cartão salvo.' });
					return;
				}

				savedCard = await prisma.savedCard.findUnique({ where: { id: parseInt(cardId) } });
				if (!savedCard || savedCard.userId !== studentId) {
					res.status(404).json({ message: 'Cartão não encontrado.' });
					return;
				}
			}

			// 5) Calcula valores
			const amount = singleWorkout.price;
			const platformFee = Math.floor(amount * tax);
			const trainerAmount = amount - platformFee;

			let payments: any[] = [];

			switch (paymentMethod) {
				case 'credit_card': {
					payments = [
						{
							payment_method: 'credit_card',
							credit_card: {
								recurrence: false,
								installments: 1,
								statement_descriptor: 'ALLFIT',
								card_id: savedCard!.pagarmeCardId,
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
					payments = [
						{
							payment_method: 'debit_card',
							debit_card: {
								card_id: savedCard!.pagarmeCardId,
							},
						},
					];
					break;
				}
				default:
					res.status(400).json({ message: 'Método de pagamento inválido.' });
					return;
			}

			console.log(student.pagarmeCustomerId);
			const payload = {
				customer_id: student.pagarmeCustomerId,
				items: [
					{
						code: singleWorkout.id.toString(),
						amount: amount,
						description: description || `Aula avulsa: ${singleWorkout.name}`,
						quantity: 1,
					},
				],
				payments,
				split: [
					{
						recipient_id: trainer.wallet.pagarmeWalletId,
						amount: trainerAmount,
						type: 'flat',
					},
					{
						recipient_id: process.env.PLATAFORMA_WALLET_ID!,
						amount: platformFee,
						type: 'flat',
					},
				],
			};

			const { data: order } = await pagarmeApi.post('/orders', payload);

			console.log('last_transaction:', JSON.stringify(order?.charges?.[0]?.last_transaction, null, 2));

			// 7) Registra a transação
			await prisma.transaction.create({
				data: {
					userId: studentId,
					trainerId,
					orderId: order.id,
					amount: trainerAmount,
					type: 'PAYMENT',
					status: order.status,
					paymentMethod,
					description: description || `Aula avulsa: ${singleWorkout.name}`,
				},
			});

			if (order.status === 'paid') {
				await prisma.wallet.update({
					where: { userId: trainerId },
					data: {
						balance: {
							increment: trainerAmount,
						},
					},
				});
			}

			res.status(200).json({
				message: 'Pagamento processado',
				order: { id: order.id, status: order.status, amount: order.amount },
				workout: {
					id: singleWorkout.id,
					name: singleWorkout.name,
				},
			});
		} catch (error: any) {
			console.error('Erro no pagamento:', error.response?.data || error.message);
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
			const formattedTransactions = transactions
				.filter((transaction) => transaction.status === 'paid')
				.map((transaction) => ({
					date: transaction.createdAt.toLocaleDateString('pt-BR'),
					name: transaction?.user?.name || 'Nome não informado',
					cpf: transaction?.user?.cpf || 'CPF não informado',
					email: transaction?.user?.email || 'Email não informado',
					amount: transaction.amount, // converter de centavos para reais
					status: transaction.status,
				}));

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

	static async editPlans(req: Request, res: Response) {
		try {
			const { planId } = req.params;
			const { name, description, price, features } = req.body;
			const plan = await prisma.plan.findUnique({ where: { id: planId } });
			if (!plan) {
				res.status(404).json({ message: 'Plano não encontrado.' });
				return;
			}
			const updatedPlan = await prisma.plan.update({
				where: { id: planId },
				data: {
					name,
					description,
					price: Math.floor(price * 100), // converter para centavos
					features,
				},
			});
			res.json({
				message: 'Plano atualizado com sucesso.',
				plan: {
					id: updatedPlan.id,
					name: updatedPlan.name,
					description: updatedPlan.description,
					price: updatedPlan.price,
					features: updatedPlan.features,
					isActive: updatedPlan.isActive,
				},
				priceFormatted: (updatedPlan.price / 100).toFixed(2),
			});
		}
		catch (error: any) {
			console.error('Erro ao editar plano:', error.message);
			res.status(500).json({ message: 'Erro ao editar plano.' });
		}
	}
}


// Função auxiliar para buscar método de pagamento da última transação
 async function getLastPaymentMethod(userId: string, trainerId: string) {
    try {
        const lastTransaction = await prisma.transaction.findFirst({
            where: {
                userId,
                trainerId,
                type: 'PAYMENT'
            },
            orderBy: { createdAt: 'desc' }
        });
        
        return lastTransaction?.paymentMethod || 'Não informado';
    } catch (error) {
        return 'Não informado';
    }
}