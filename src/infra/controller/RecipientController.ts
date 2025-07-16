// infra/controller/PagarmeController.ts
import pagarmeApi from '@/lib/axios';
import { PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';
import { Request, Response } from 'express';

const prisma = new PrismaClient();

const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutos

export default class RecipientController {
	/**
	 * Criar recebedor (recipient) para treinador
	 */
	createTrainerWallet = async (req: Request, res: Response) => {
		try {
			const { userId, address, personalData, bankData } = req.body;

			if (
				!userId ||
				!address?.zipCode ||
				!personalData?.birthdate ||
				!bankData?.bank ||
				!bankData?.accountNumber ||
				!bankData?.accountCheckDigit
			) {
				res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
				return;
			}

			// Verifica se o usuário é um treinador
			const user = await prisma.user.findUnique({
				where: { id: userId },
			});

			if (!user || user.role !== 'TRAINER') {
				res.status(400).json({ message: 'Usuário deve ser um treinador.' });
				return;
			}

			// Verifica se já existe wallet
			const existingWallet = await prisma.wallet.findUnique({
				where: { userId },
			});

			if (existingWallet) {
				res.status(400).json({ message: 'Treinador já possui uma carteira.' });
				return;
			}

			const recipientPayload = {
				register_information: {
					phone_numbers: [
						{
							ddd: user.number.substring(0, 2),
							number: user.number.substring(2),
							type: 'mobile',
						},
					],
					address: {
						street: address?.street,
						complementary: address?.complementary || '',
						street_number: address?.streetNumber,
						neighborhood: address?.neighborhood,
						city: address?.city,
						state: address?.state,
						zip_code: address?.zipCode,
						reference_point: address?.referencePoint || '',
					},
					name: user.name,
					email: user.email,
					document: user.cpf,
					type: 'individual',
					mother_name: personalData?.motherName || '',
					birthdate: dayjs(personalData.birthdate).format('DD/MM/YYYY'),
					monthly_income: personalData?.monthlyIncome || 0,
					professional_occupation: personalData?.professionalOccupation || '',
				},
				default_bank_account: {
					holder_name: bankData?.holderName,
					holder_type: 'individual',
					holder_document: user.cpf,
					bank: bankData.bank,
					branch_number: bankData.branchNumber,
					branch_check_digit: bankData.branchCheckDigit,
					account_number: bankData.accountNumber,
					account_check_digit: bankData.accountCheckDigit,
					type: bankData.accountType,
				},
			};

			// Variáveis para controle de rollback
			let recipientPm: any = { id: null };
			let wallet = null;
			let userAddress = null;
			let recipientInfos = null;

			try {
				const result = await prisma.$transaction(async (tx) => {
					// Criar wallet (sem pagarmeWalletId ainda)
					const wallet = await tx.wallet.create({
						data: {
							userId,
							pagarmeWalletId: null, // Será atualizado após criar na PagarMe
							balance: 0,
							lastSynced: new Date(),
						},
					});

					// Criar endereço
					const userAddress = await tx.address.upsert({
						where: {
							userId: userId,
						},
						create: {
							userId,
							street: address?.street,
							complementary: address?.complementary,
							streetNumber: address?.streetNumber,
							neighborhood: address?.neighborhood,
							city: address?.city,
							state: address?.state,
							zipCode: address?.zipCode,
							referencePoint: address?.referencePoint,
						},
						update: {
							street: address?.street,
							complementary: address?.complementary,
							streetNumber: address?.streetNumber,
							neighborhood: address?.neighborhood,
							city: address?.city,
							state: address?.state,
							zipCode: address?.zipCode,
							referencePoint: address?.referencePoint,
						},
					});

					// Criar informações do recipient
					const recipientInfos = await tx.recipientInfo.upsert({
						where: {
							userId,
						},
						create: {
							userId,
							addressId: userAddress.id,
							siteUrl: personalData?.siteUrl || '',
							motherName: personalData?.motherName || '',
							birthdate: dayjs(personalData.birthdate).format('DD/MM/YYYY'),
							monthlyIncome: personalData?.monthlyIncome || 0,
							professionalOccupation: personalData?.professionalOccupation || '',
							bankHolderName: bankData?.holderName,
							bankHolderDocument: user.cpf,
							bank: bankData.bank,
							branchNumber: bankData.branchNumber,
							branchCheckDigit: bankData.branchCheckDigit,
							accountNumber: bankData.accountNumber,
							accountCheckDigit: bankData.accountCheckDigit,
							accountType: bankData.accountType,
						},
						update: {
							addressId: userAddress.id,
							siteUrl: personalData?.siteUrl || '',
							motherName: personalData?.motherName || '',
							birthdate: dayjs(personalData.birthdate).format('DD/MM/YYYY'),
							monthlyIncome: personalData?.monthlyIncome || 0,
							professionalOccupation: personalData?.professionalOccupation || '',
							bankHolderName: bankData?.holderName,
							bankHolderDocument: user.cpf,
							bank: bankData.bank,
							branchNumber: bankData.branchNumber,
							branchCheckDigit: bankData.branchCheckDigit,
							accountNumber: bankData.accountNumber,
							accountCheckDigit: bankData.accountCheckDigit,
							accountType: bankData.accountType,
						},
					});

					return { wallet, userAddress, recipientInfos };
				});

				wallet = result.wallet;
				userAddress = result.userAddress;
				recipientInfos = result.recipientInfos;

				const response = await pagarmeApi.post('/recipients', recipientPayload);
				recipientPm = response.data;

				// Atualizar wallet com o ID da PagarMe
				await prisma.wallet.update({
					where: { id: wallet.id },
					data: {
						pagarmeWalletId: recipientPm.id,
					},
				});

				res.status(201).json({
					message: 'Carteira criada com sucesso',
					wallet: {
						id: wallet.id,
						balance: wallet.balance,
						recipientId: recipientPm.id,
					},
				});
			} catch (dbError: any) {
				console.error('Erro durante operação no banco:', dbError);

				// Se houve erro na transação do banco, executar rollback se necessário
				if (wallet || userAddress || recipientInfos) {
					await this.createWalletRollback(wallet, userAddress, recipientInfos);
				}

				throw dbError;
			}
		} catch (error: any) {
			console.error('Erro ao criar carteira:', error.response?.data || error.message);
			res.status(500).json({ message: 'Erro ao criar carteira do treinador.' });
		}
	};
	// Método auxiliar para executar rollback
	createWalletRollback = async (wallet: any, userAddress: any, recipientInfos: any) => {
		const rollbackErrors: string[] = [];

		console.log('Iniciando rollback...');

		// Rollback na ordem inversa da criação
		if (recipientInfos) {
			try {
				await prisma.recipientInfo.delete({ where: { id: recipientInfos.id } });
			} catch (error: any) {
				rollbackErrors.push(`Erro ao deletar recipientInfo: ${error.message}`);
			}
		}

		if (userAddress) {
			try {
				await prisma.address.delete({ where: { id: userAddress.id } });
			} catch (error: any) {
				rollbackErrors.push(`Erro ao deletar address: ${error.message}`);
			}
		}

		if (wallet) {
			try {
				await prisma.wallet.delete({ where: { id: wallet.id } });
			} catch (error: any) {
				rollbackErrors.push(`Erro ao deletar wallet: ${error.message}`);
			}
		}

		if (rollbackErrors.length > 0) {
			console.error('Erros durante rollback:', rollbackErrors);
		} else {
			console.log('Rollback executado com sucesso');
		}
	};
	/**
	 * Consulta saldo com sincronização automática
	 */
	getTrainerBalance = async (req: Request, res: Response) => {
		try {
			const { userId } = req.params;

			const wallet = await prisma.wallet.findUnique({
				where: { userId },
				include: { user: { select: { role: true } } },
			});

			if (!wallet) {
				res.status(404).json({ message: 'Carteira não encontrada.' });
				return;
			}

			if (wallet.user.role !== 'TRAINER') {
				res.status(400).json({ message: 'Usuário não é um treinador.' });
				return;
			}

			const agora = Date.now();
			const diff = agora - wallet.lastSynced.getTime();

			// Se já sincronizou recentemente, retorna saldo local
			if (diff < SYNC_INTERVAL) {
				res.json({
					balance: wallet.balance,
					source: 'local',
					lastSynced: wallet.lastSynced,
				});
				return;
			}

			// Sincroniza com Pagar.me
			const { data: balance } = await pagarmeApi.get(`/recipients/${wallet.pagarmeWalletId}/balance`);

			const currentBalance = balance.available_amount || 0;

			// Atualiza saldo local
			const updatedWallet = await prisma.wallet.update({
				where: { userId },
				data: {
					balance: currentBalance,
					lastSynced: new Date(),
				},
			});

			res.json({
				balance: currentBalance,
				source: 'pagarme',
				lastSynced: updatedWallet.lastSynced,
				waiting_funds: balance.waiting_funds_amount || 0,
			});
		} catch (error: any) {
			console.error('Erro ao consultar saldo:', error.response?.data || error.message);
			res.status(500).json({ message: 'Falha ao sincronizar saldo.' });
		}
	};
	/**
	 * Editar dados bancários (Ainda não disponível em decorrencia da configuração de dois fatores Pagar.me)
	 */
	editBankAccount = async (req: Request, res: Response) => {
		const { userId } = req.params;
		let originalBankData: any;
		try {
			const { bankAccount } = req.body;

			const user = await prisma.user.findUnique({
				where: { id: userId },
				include: {
					recipientInfo: {
						include: {
							address: true,
						},
					},
				},
			});

			if (!user) {
				return res.status(404).json({ message: 'Usuário não encontrado' });
			}

			if (!user.recipientInfo) {
				return res.status(400).json({
					message:
						'Usuário não possui informações de recipient. Configure primeiro as informações completas.',
				});
			}

			// Guardar dados originais para rollback
			originalBankData = {
				bankHolderName: user.recipientInfo.bankHolderName,
				bankHolderType: user.recipientInfo.bankHolderType,
				bankHolderDocument: user.recipientInfo.bankHolderDocument,
				bank: user.recipientInfo.bank,
				branchNumber: user.recipientInfo.branchNumber,
				branchCheckDigit: user.recipientInfo.branchCheckDigit,
				accountNumber: user.recipientInfo.accountNumber,
				accountCheckDigit: user.recipientInfo.accountCheckDigit,
				accountType: user.recipientInfo.accountType,
				updatedAt: user.recipientInfo.updatedAt,
			};

			const pagarmeUpdateData = {
				bank_account: {
					holder_name: bankAccount.bankHolderName,
					holder_type: 'individual',
					bank: bankAccount.bank,
					branch_number: bankAccount.branchNumber,
					branch_check_digit: bankAccount.branchCheckDigit,
					account_number: bankAccount.accountNumber,
					account_check_digit: bankAccount.accountCheckDigit,
					type: bankAccount.accountType, // checking ou savings
				},
			};

			let recipientId = user.recipientInfo.id;

			const updatedRecipientInfo = await prisma.recipientInfo.update({
				where: { userId },
				data: {
					bankHolderName: bankAccount.bankHolderName,
					bankHolderType: bankAccount.bankHolderType,
					bankHolderDocument: bankAccount.bankHolderDocument,
					bank: bankAccount.bank,
					branchNumber: bankAccount.branchNumber,
					branchCheckDigit: bankAccount.branchCheckDigit,
					accountNumber: bankAccount.accountNumber,
					accountCheckDigit: bankAccount.accountCheckDigit,
					accountType: bankAccount.accountType,
					updatedAt: new Date(),
				},
				include: {
					address: true,
				},
			});

			// Chamar API do Pagar.me
			const pagarmeResponse = await pagarmeApi.patch(
				`/recipients/${recipientId}/default-bank-account`,
				pagarmeUpdateData
			);

			if (pagarmeResponse.status !== 200) {
				throw new Error('Erro ao atualizar dados no Pagar.me');
			}

			res.json({
				message: 'Dados bancários atualizados com sucesso',
				recipientInfo: updatedRecipientInfo,
				pagarmeResponse: pagarmeResponse.data,
			});
		} catch (error: any) {
			console.error('Erro ao editar dados bancários:', error.response?.data || error.message);

			// Rollback do banco local se houver erro na API do Pagar.me
			if (originalBankData && userId) {
				try {
					await prisma.recipientInfo.update({
						where: { userId },
						data: originalBankData,
					});
					console.log('Rollback realizado com sucesso no banco local');
				} catch (rollbackError) {
					console.error('Erro ao fazer rollback no banco local:', rollbackError);
				}
			}

			// Tratamento específico para erros do Pagar.me
			if (error.response?.status === 400) {
				return res.status(400).json({
					message: 'Dados bancários inválidos',
					details: error.response.data,
				});
			}

			if (error.response?.status === 404) {
				return res.status(404).json({
					message: 'Recipient não encontrado no Pagar.me',
				});
			}

			res.status(500).json({
				message: 'Erro interno do servidor ao atualizar dados bancários',
			});
		}
	};
	/**
	 * Solicitação de saque
	 */
	requestWithdrawal = async (req: Request, res: Response) => {
		try {
			const { userId } = req.params;
			const { amount, description } = req.body;

			// Validações básicas
			if (!amount || amount <= 0) {
				res.status(400).json({ message: 'Valor deve ser maior que zero.' });
				return;
			}

			// Validar valor mínimo (R$ 10,00)
			const MIN_WITHDRAW_AMOUNT = 1000; // R$ 10,00 em centavos
			if (amount < MIN_WITHDRAW_AMOUNT) {
				res.status(400).json({
					message: `Valor mínimo para saque é R$ ${(MIN_WITHDRAW_AMOUNT / 100).toFixed(2)}`,
					minimumAmount: MIN_WITHDRAW_AMOUNT,
				});
				return;
			}

			// Buscar dados completos do treinador
			const user = await prisma.user.findUnique({
				where: { id: userId },
				include: {
					wallet: true,
					recipientInfo: {
						include: {
							address: true,
						},
					},
				},
			});

			if (!user) {
				res.status(404).json({ message: 'Usuário não encontrado.' });
				return;
			}

			if (user.role !== 'TRAINER') {
				res.status(400).json({ message: 'Apenas treinadores podem sacar.' });
				return;
			}

			if (!user.wallet) {
				res.status(404).json({ message: 'Carteira não encontrada.' });
				return;
			}

			if (!user.recipientInfo) {
				res.status(400).json({
					message: 'Informações bancárias não cadastradas. Complete seu cadastro primeiro.',
					action: 'complete_bank_info',
				});
				return;
			}

			// Verificar saldo no Pagar.me (sempre buscar valor atualizado)
			const { data: balance } = await pagarmeApi.get(`/recipients/${user.wallet.pagarmeWalletId}/balance`);
			const availableAmount = balance.available_amount || 0;

			// Verificar se tem saldo suficiente
			if (availableAmount < amount) {
				res.status(400).json({
					message: 'Saldo insuficiente.',
					available: availableAmount,
					availableFormatted: (availableAmount / 100).toFixed(2),
					requested: amount,
					requestedFormatted: (amount / 100).toFixed(2),
				});
				return;
			}

			// Preparar dados da conta bancária a partir das informações salvas
			const bankAccountData = {
				holder_name: user.recipientInfo.bankHolderName,
				holder_type: user.recipientInfo.bankHolderType,
				holder_document: user.recipientInfo.bankHolderDocument,
				bank: user.recipientInfo.bank,
				branch_number: user.recipientInfo.branchNumber,
				branch_check_digit: user.recipientInfo.branchCheckDigit,
				account_number: user.recipientInfo.accountNumber,
				account_check_digit: user.recipientInfo.accountCheckDigit,
				type: user.recipientInfo.accountType,
			};

			// Preparar payload para transferência
			const transferPayload = {
				amount,
				recipient_id: user.wallet.pagarmeWalletId,
				bank_account: bankAccountData,
				metadata: {
					trainer_id: userId,
					type: 'withdrawal',
					description: description || 'Saque solicitado',
				},
			};

			// Variáveis para controle de transação
			let transaction: any = null;
			let transfer: any = null;

			try {
				// Criar registro de transação primeiro (com status PENDING)
				transaction = await prisma.transaction.create({
					data: {
						userId: null, // não há usuário pagador no saque
						trainerId: userId,
						transferId: null, // será atualizado após criar a transferência
						amount,
						type: 'WITHDRAWAL',
						status: 'PENDING',
						description: description || 'Saque solicitado',
						paymentMethod: 'bank_transfer',
					},
				});

				// Solicitar transferência no Pagar.me
				const transferResponse = await pagarmeApi.post('/transfers', transferPayload);
				transfer = transferResponse.data;

				// Atualizar transação com o ID da transferência
				const updatedTransaction = await prisma.transaction.update({
					where: { id: transaction.id },
					data: {
						transferId: transfer.id,
						status: transfer.status || 'PENDING',
					},
				});

				// Atualizar saldo local e data de sincronização
				await prisma.wallet.update({
					where: { userId },
					data: {
						balance: availableAmount - amount, // Decrementa o saldo imediatamente
						lastSynced: new Date(),
					},
				});

				// Resposta de sucesso
				res.json({
					success: true,
					message: 'Saque solicitado com sucesso',
					transaction: {
						id: updatedTransaction.id,
						transferId: transfer.id,
						amount: transfer.amount,
						amountFormatted: (transfer.amount / 100).toFixed(2),
						status: transfer.status,
						description: updatedTransaction.description,
						createdAt: updatedTransaction.createdAt,
					},
					balance: {
						previous: availableAmount,
						current: availableAmount - amount,
						currentFormatted: ((availableAmount - amount) / 100).toFixed(2),
					},
				});
			} catch (transferError: any) {
				console.error(
					'Erro ao processar transferência:',
					transferError.response?.data || transferError.message
				);

				// Rollback: atualizar status da transação para FAILED se ela foi criada
				if (transaction) {
					await prisma.transaction.update({
						where: { id: transaction.id },
						data: {
							status: 'FAILED',
							description: `${transaction.description} - Erro: ${transferError.message}`,
						},
					});
				}

				// Tratamento específico de erros do Pagar.me
				if (transferError.response?.status === 400) {
					res.status(400).json({
						success: false,
						message: 'Dados da transferência inválidos',
						details: transferError.response.data,
						transactionId: transaction?.id,
					});
					return;
				}

				if (transferError.response?.status === 422) {
					res.status(422).json({
						success: false,
						message: 'Erro de validação nos dados bancários',
						details: transferError.response.data,
						transactionId: transaction?.id,
					});
					return;
				}

				throw transferError; // Re-throw para ser capturado pelo catch externo
			}
		} catch (error: any) {
			console.error('Erro no saque:', error.response?.data || error.message);
			res.status(500).json({
				success: false,
				message: 'Erro interno ao processar saque.',
				error: process.env.NODE_ENV === 'development' ? error.message : undefined,
			});
		}
	};

	// Método adicional para verificar se pode sacar
	canWithdraw = async (req: Request, res: Response) => {
		try {
			const { userId } = req.params;
			const { amount } = req.query;

			const user = await prisma.user.findUnique({
				where: { id: userId },
				include: {
					wallet: true,
					recipientInfo: true,
				},
			});

			if (!user) {
				res.status(404).json({ message: 'Usuário não encontrado' });
				return;
			}

			if (user.role !== 'TRAINER') {
				res.status(400).json({ message: 'Apenas treinadores podem sacar' });
				return;
			}

			const checks = {
				hasWallet: !!user.wallet,
				hasBankInfo: !!user.recipientInfo,
				canWithdraw: false,
				availableBalance: 0,
				minimumAmount: 1000, // R$ 10,00
				reasons: [] as string[],
			};

			if (!user.wallet) {
				checks.reasons.push('Carteira não encontrada');
			}

			if (!user.recipientInfo) {
				checks.reasons.push('Informações bancárias não cadastradas');
			}

			if (user.wallet && user.recipientInfo) {
				// Buscar saldo atual
				try {
					const { data: balance } = await pagarmeApi.get(
						`/recipients/${user.wallet.pagarmeWalletId}/balance`
					);
					checks.availableBalance = balance.available_amount || 0;

					if (amount) {
						const requestedAmount = parseInt(amount as string);

						if (requestedAmount < checks.minimumAmount) {
							checks.reasons.push(`Valor mínimo é R$ ${(checks.minimumAmount / 100).toFixed(2)}`);
						}

						if (checks.availableBalance < requestedAmount) {
							checks.reasons.push('Saldo insuficiente');
						}

						if (checks.reasons.length === 0) {
							checks.canWithdraw = true;
						}
					}
				} catch (balanceError) {
					checks.reasons.push('Erro ao verificar saldo');
				}
			}

			res.json({
				...checks,
				availableBalanceFormatted: (checks.availableBalance / 100).toFixed(2),
				minimumAmountFormatted: (checks.minimumAmount / 100).toFixed(2),
			});
		} catch (error: any) {
			console.error('Erro ao verificar possibilidade de saque:', error);
			res.status(500).json({ message: 'Erro interno' });
		}
	};

	// Método para histórico de saques
	getWithdrawHistory = async (req: Request, res: Response) => {
		try {
			const { userId } = req.params;
			const { page = 1, limit = 10 } = req.query;

			const pageNumber = parseInt(page as string);
			const limitNumber = parseInt(limit as string);
			const offset = (pageNumber - 1) * limitNumber;

			const user = await prisma.user.findUnique({
				where: { id: userId },
				select: { role: true },
			});

			if (!user) {
				res.status(404).json({ message: 'Usuário não encontrado' });
				return;
			}

			if (user.role !== 'TRAINER') {
				res.status(400).json({ message: 'Apenas treinadores podem ver histórico de saques' });
				return;
			}

			const [transactions, total] = await Promise.all([
				prisma.transaction.findMany({
					where: {
						trainerId: userId,
						type: 'WITHDRAWAL',
					},
					orderBy: {
						createdAt: 'desc',
					},
					skip: offset,
					take: limitNumber,
					select: {
						id: true,
						amount: true,
						status: true,
						description: true,
						createdAt: true,
						transferId: true,
						paymentMethod: true,
					},
				}),
				prisma.transaction.count({
					where: {
						trainerId: userId,
						type: 'WITHDRAWAL',
					},
				}),
			]);

			res.json({
				transactions,
				pagination: {
					page: pageNumber,
					limit: limitNumber,
					total,
					totalPages: Math.ceil(total / limitNumber),
					hasNext: pageNumber * limitNumber < total,
					hasPrev: pageNumber > 1,
				},
			});
		} catch (error: any) {
			console.error('Erro ao buscar histórico de saques:', error);
			res.status(500).json({ message: 'Erro interno' });
		}
	};
}
