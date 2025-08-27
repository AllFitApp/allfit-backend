import pagarmeApi from '@/lib/axios';
import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';

const prisma = new PrismaClient();

export default class CustomerController {
	static async createCustomer({ userId }: { userId: string; }) {
		try {
			if (!userId) {
				return {
					data: {
						message: 'userId e document são obrigatórios.',
					},
					status: 400,
				};
			}

			// 1. Verificar se o usuário existe na tabela User
			const user = await prisma.user.findUnique({
				where: { id: userId },
				select: {
					id: true,
					name: true,
					email: true,
					number: true,
					cpf: true,
					pagarmeCustomerId: true,
					role: true,
				},
			});
			if (!user) {
				return {
					data: {
						message: 'Usuário não encontrado.',
					},
					status: 404,
				};
			}

			if (user.role !== 'USER') {
				return {
					data: {
						message: 'Usuário deve ser um aluno.',
					},
					status: 400,
				};
			}
			// Verificar se o usuário já possui um customer ID
			if (user.pagarmeCustomerId) {
				return {
					data: {
						message: 'Usuário já possui um customer ID associado.',
					},
					status: 400,
				};
			}

			// Verificar se name e email são obrigatórios no User
			if (!user.name || !user.email) {
				return {
					data: {
						message: 'Usuário deve ter nome e email cadastrados.',
					},
					status: 400,
				};
			}

			const phone = user.number.replace(/\D/g, '');
			if (!/^[1-9]{2}9[0-9]{8}$/.test(phone)) {
				return {
					data: {
						message: 'Número de telefone inválido.',
					},
					status: 400,
				};
			}
			// 2. Chamar a API Pagarme usando os dados do usuário da tabela User
			const { data: customerPm } = await pagarmeApi.post('/customers', {
				name: user.name,
				email: user.email,
				type: 'individual',
				country: 'br',
				documents: [{ type: 'cpf', number: user.cpf }],
				phones: {
					mobile_phone: {
						country_code: '55',
						number: user.number.replace(/\D/g, '').slice(-9),
						area_code: user.number.replace(/\D/g, '').slice(-11, -9),
					},
				},
			});

			// 3. Atualizar a coluna customerID na tabela User
			const updatedUser = await prisma.user.update({
				where: { id: userId },
				data: {
					pagarmeCustomerId: customerPm.id,
				},
			});

			return {
				data: {
					message: 'Customer criado com sucesso.',
					user: updatedUser,
				},
				status: 201,
			};
		} catch (error: any) {
			console.error('Erro ao criar customer:', error.response?.data || error.message);

			// Tratamento específico para erros da API Pagarme
			if (error.response?.status === 422) {
				return {
					data: {
						message: 'Dados inválidos para criação do customer.',
						details: error.response.data,
					},
					status: 422,
				};
			}

			if (error.response?.status === 400) {
				return {
					data: {
						message: 'Erro na requisição para a API Pagarme.',
						details: error.response.data,
					},
					status: 400,
				};
			}

			return {
				data: {
					message: 'Erro interno do servidor ao criar customer.',
					details: error.response.data,
				},
				status: 500,
			};
		}
	}

	static async getCustomer(req: Request, res: Response) {
		try {
			const userId = String(req.params.userId);
			const local = await prisma.user.findUnique({ where: { id: userId } });
			if (!local || !local.pagarmeCustomerId) {
				res.status(404).json({ message: 'Customer não encontrado localmente.' });
				return;
			}
			const { data: customerPm } = await pagarmeApi.get(`/customers/${local.pagarmeCustomerId}`);

			// Atualiza local se divergente
			if (customerPm.email !== local.email || customerPm.name !== local.name) {
				await prisma.user.update({
					where: { id: userId },
					data: { name: customerPm.name, email: customerPm.email },
				});
			}
			res.json({
				id: local.id,
				pagarmeCustomerId: local.pagarmeCustomerId,
				name: customerPm.name,
				email: customerPm.email,
			});
		} catch (error: any) {
			console.error(error.response?.data || error.message);
			res.status(500).json({ message: 'Erro ao obter customer.' });
		}
	}

	static async updateCustomer(req: Request, res: Response) {
		try {
			const { userId } = req.params;

			const { name, email, cpf, number } = req.body;
			const local = await prisma.user.findUnique({ where: { id: userId } });
			if (!local || !local.pagarmeCustomerId) {
				res.status(404).json({ message: 'Customer não encontrado.' });
				return;
			}
			const raw = number.toString().replace(/\D/g, ''); // mantém só dígitos
			const { data: customerPm } = await pagarmeApi.put(`/customers/${local.pagarmeCustomerId}`, {
				name,
				email,
				document: cpf,
				type: 'individual',
				country: 'br',
				documents: cpf,
				phones: {
					mobile_phone: {
						country_code: '55',
						area_code: raw.slice(0, 2),
						number: raw.slice(2)
					},
				},
			});
			const updated = await prisma.user.update({
				where: { id: userId },
				data: {
					name: customerPm.name,
					email: customerPm.email,
					cpf: customerPm.cpf,
					number: raw
				},

			});
			console.log('atualiza');
			res.json(updated);
		} catch (error: any) {
			console.error(error.response?.data || error.message);
			res.status(500).json({ message: 'Erro ao atualizar customer.' });
		}
	}

	static async listCustomers(req: Request, res: Response) {
		try {
			const { data: customers } = await pagarmeApi.get('/customers');
			res.json(customers);
		} catch (error: any) {
			console.error(error.response?.data || error.message);
			res.status(500).json({ message: 'Erro ao buscar clientes.' });
		}
	}

	/**
	 * Salvar cartão do aluno
	 */
	static async saveCard(req: Request, res: Response) {
		try {
			const { userId, cardData } = req.body;

			const user = await prisma.user.findUnique({
				where: { id: userId },
				select: { pagarmeCustomerId: true },
			});

			if (!user?.pagarmeCustomerId) {
				res.status(400).json({ message: 'Usuário deve ter um customer ID.' });
				return;
			}

			// Se for definido como padrão, remove o padrão dos outros cartões
			if (cardData.isDefault) {
				await prisma.savedCard.updateMany({
					where: { userId },
					data: { isDefault: false },
				});
			}

			const cardPayload = {
				number: cardData.number,
				holder_name: cardData.holderName,
				holder_document: cardData.holderDocument,
				exp_month: cardData.expMonth,
				exp_year: cardData.expYear,
				cvv: cardData.cvv,
				options: {
					verify_card: true,
				},
			};

			const { data: card } = await pagarmeApi.post(`/customers/${user.pagarmeCustomerId}/cards`, cardPayload);

			// Salva cartão localmente
			const savedCard = await prisma.savedCard.create({
				data: {
					userId,
					pagarmeCardId: card.id,
					lastFour: card.last_four_digits,
					brand: card.brand,
					holderName: card.holder_name,
					type: card.type,
					isDefault: cardData.isDefault,
				},
			});

			res.status(201).json({
				message: 'Cartão salvo com sucesso',
				card: {
					id: savedCard.id,
					lastFour: savedCard.lastFour,
					brand: savedCard.brand,
					holderName: savedCard.holderName,
					isDefault: savedCard.isDefault,
				},
			});
		} catch (error: any) {
			console.error('Erro ao salvar cartão:', error.response?.data || error.message);
			res.status(500).json({ message: 'Erro ao salvar cartão.' });
		}
	}
	/**
	 * Listar cartões salvos
	 */
	static async getSavedCards(req: Request, res: Response) {
		try {
			const { userId } = req.params;

			const cards = await prisma.savedCard.findMany({
				where: { userId },
				select: {
					id: true,
					lastFour: true,
					brand: true,
					holderName: true,
					isDefault: true,
					createdAt: true,
					expMonth: true,
					expYear: true,
					lastFourDigits: true,
					status: true,
				},
				orderBy: { createdAt: 'desc' },
			});

			res.json(cards);
		} catch (error: any) {
			console.error('Erro ao buscar cartões:', error.response?.data || error.message);
			res.status(500).json({ message: 'Erro ao buscar cartões.' });
		}
	}
	/**
	 * Sincroniza cartões na Pagarme com o banco local (atualiza, cria, deleta em local)
	 */
	static async syncSavedCards(req: Request, res: Response) {
		try {
			const { userId } = req.params;

			// 1. Busca o usuário e o customerId
			const user = await prisma.user.findUnique({
				where: { id: userId },
				select: { pagarmeCustomerId: true },
			});

			if (!user?.pagarmeCustomerId) {
				return res.status(400).json({ message: 'Usuário não possui customerId na Pagarme.' });
			}

			// 2. Busca cartões na Pagar.me
			const { data: pagarmeCards } = await pagarmeApi.get(
				`/customers/${user.pagarmeCustomerId}/cards`
			);

			const remoteCards = pagarmeCards.data; // lista de cartões
			const remoteIds = remoteCards.map((c: any) => c.id);

			// 3. Busca cartões locais
			const localCards = await prisma.savedCard.findMany({
				where: { userId },
				select: { pagarmeCardId: true },
			});

			const localIds = localCards.map(c => c.pagarmeCardId);

			// 4. Inserir cartões que existem na Pagar.me mas não localmente
			for (const card of remoteCards) {
				if (!localIds.includes(card.id)) {
					await prisma.savedCard.create({
						data: {
							userId,
							pagarmeCardId: card.id,
							lastFour: card.last_four_digits,
							brand: card.brand,
							holderName: card.holder_name,
							holderDocument: card.holder_document ?? '',
							expMonth: card.exp_month,
							expYear: card.exp_year,
							lastFourDigits: card.last_four_digits,
							firstSixDigits: card.first_six_digits,
							status: card.status,
							type: card.type,
							isDefault: false, // pode ajustar a lógica
						},
					});
				} else {
					// 5. Atualizar dados caso haja divergência
					await prisma.savedCard.updateMany({
						where: { pagarmeCardId: card.id },
						data: {
							lastFour: card.last_four_digits,
							brand: card.brand,
							holderName: card.holder_name,
							holderDocument: card.holder_document ?? '',
							expMonth: card.exp_month,
							expYear: card.exp_year,
							lastFourDigits: card.last_four_digits,
							firstSixDigits: card.first_six_digits,
							status: card.status,
							type: card.type,
						},
					});
				}
			}

			// 6. Remover cartões locais que não existem mais na Pagar.me
			const toDelete = localIds.filter(id => !remoteIds.includes(id));
			if (toDelete.length > 0) {
				await prisma.savedCard.deleteMany({
					where: { pagarmeCardId: { in: toDelete } },
				});
			}

			res.json({ message: 'Sincronização concluída com sucesso.' });
		} catch (error: any) {
			console.error('Erro ao sincronizar cartões:', error.response?.data || error.message);
			res.status(500).json({ message: 'Erro ao sincronizar cartões.' });
		}
	}
}
