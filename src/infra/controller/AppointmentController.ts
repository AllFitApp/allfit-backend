import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';

const prisma = new PrismaClient();

export default class AppointmentController {
	static async addTrainerSchedule(req: Request, res: Response): Promise<void> {
		try {
			const { id, horarios, savedLocations, defaultLocationConfig } = req.body;

			if (!id || !Array.isArray(horarios)) {
				res.status(400).json({ message: 'Trainer ID e horarios são obrigatórios' });
				return;
			}

			// Verifica se o treinador existe
			const trainer = await prisma.user.findUnique({ where: { id } });
			if (!trainer || trainer.role !== 'TRAINER') {
				res.status(404).json({ message: 'Treinador não encontrado' });
				return;
			}

			// Prepara os dados para salvar
			const dataToUpdate = {
				horarios,
				...(savedLocations && { savedLocations }),
				...(defaultLocationConfig && { defaultLocationConfig }),
			};

			const savedSchedule = await prisma.trainerHorarios.upsert({
				where: { trainerId: id },
				update: dataToUpdate,
				create: {
					trainerId: id,
					...dataToUpdate
				},
			});

			res.status(200).json(savedSchedule);
		} catch (err) {
			console.error('Erro ao salvar agenda do treinador:', err);
			res.status(500).json({ message: 'Erro ao salvar agenda', err });
		}
	}

	static async getTrainerSchedule(req: Request, res: Response): Promise<void> {
		try {
			const { trainerUsername } = req.params;

			const schedule = await prisma.trainerHorarios.findFirst({
				where: {
					trainer: {
						username: trainerUsername
					}
				},
			});

			if (!schedule) {
				res.status(404).json({ message: 'Agenda não encontrada' });
				return;
			}

			// Cast para o tipo correto
			const horarios = (schedule.horarios as any[]) ?? [];
			let defaultLocations: any[] = [];
			if (
				schedule.defaultLocationConfig &&
				typeof schedule.defaultLocationConfig === 'object' &&
				'locations' in schedule.defaultLocationConfig &&
				Array.isArray((schedule.defaultLocationConfig as any).locations)
			) {
				defaultLocations = (schedule.defaultLocationConfig as any).locations;
			}

			const allLocations: any[] = [];

			// 1. Dos horários
			horarios.forEach((dayObj) => {
				dayObj.intervals?.forEach((interval: any) => {
					if (Array.isArray(interval.locations)) {
						allLocations.push(...interval.locations);
					}
				});
			});

			// 2. Do defaultLocationConfig
			if (Array.isArray(defaultLocations)) {
				allLocations.push(...defaultLocations);
			}

			// 3. Agrupar por tipo
			const gyms = Array.from(
				new Map(
					allLocations
						.filter((loc) => loc.type === "academia")
						.map((loc) => [loc.name, loc])
				).values()
			);

			const domicile = allLocations.some((loc) => loc.type === "domicilio");

			const others = Array.from(
				new Map(
					allLocations
						.filter((loc) => !["academia", "domicilio"].includes(loc.type))
						.map((loc) => [loc.name ?? loc.type, loc])
				).values()
			);

			const available_locations = { gyms, domicile, others };

			res.status(200).json({
				...schedule,
				available_locations
			});

		} catch (err) {
			console.error('Erro ao buscar agenda do treinador:', err);
			res.status(500).json({ message: 'Erro ao buscar agenda', err });
		}
	}

	static async getAll(req: Request, res: Response): Promise<void> {
		try {
			const appointments = await prisma.appointment.findMany({
				orderBy: { date: 'asc' },
				include: {
					trainer: {
						select: { id: true, name: true, username: true }
					},
					subscription: {
						select: { id: true, planPrice: true, plan: { select: { name: true } } }
					},
					singleWorkout: {
						select: { id: true, name: true, price: true, duration: true }
					}
				}
			});

			res.status(200).json(appointments);
		} catch (err) {
			res.status(500).json({ message: 'Erro ao buscar agendamentos', err });
		}
	}

	static async getById(req: Request, res: Response): Promise<void> {
		try {
			const { id } = req.params;

			const appointment = await prisma.appointment.findUnique({
				where: { id },
				include: {
					trainer: {
						select: { id: true, name: true, username: true }
					},
					subscription: {
						select: { id: true, planPrice: true, plan: { select: { name: true } } }
					},
					singleWorkout: {
						select: { id: true, name: true, price: true, duration: true }
					}
				}
			});

			if (!appointment) {
				res.status(404).json({ message: 'Agendamento não encontrado' });
				return;
			}

			res.status(200).json(appointment);
		} catch (err) {
			res.status(500).json({ message: 'Erro ao buscar agendamento', err });
		}
	}

	static async getByMonth(req: Request, res: Response): Promise<void> {
		try {
			const { year, month, id } = req.params;

			const parsedYear = parseInt(year);
			const parsedMonth = parseInt(month);

			if (isNaN(parsedYear) || isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
				res.status(400).json({ message: 'Parâmetros inválidos: forneça ano e mês válidos' });
				return;
			}

			const startDate = new Date(parsedYear, parsedMonth - 1, 1);
			const endDate = new Date(parsedYear, parsedMonth, 0, 23, 59, 59, 999); // último dia do mês

			const appointments = await prisma.appointment.findMany({
				where: {
					OR: [{ trainerId: id }, { studentId: id }],
					date: {
						gte: startDate,
						lte: endDate,
					},
				},
				orderBy: { date: 'asc' },
				include: {
					trainer: {
						select: { id: true, name: true, username: true }
					},
					student: {
						select: { id: true, name: true, username: true }
					},
					subscription: {
						select: { id: true, planPrice: true, plan: { select: { name: true } } }
					},
					singleWorkout: {
						select: { id: true, name: true, price: true, duration: true, }
					},
					workoutSession: true
				}
			});

			res.status(200).json(appointments);
		} catch (err) {
			res.status(500).json({ message: 'Erro ao buscar agendamentos do mês', err });
		}
	}

	static async create(req: Request, res: Response): Promise<void> {
		try {
			const {
				trainerId,
				studentId,
				location,
				date,
				notes,
				subscriptionId,
				singleWorkoutId
			} = req.body;

			// Validações básicas
			if (!trainerId || !date || !location) {
				res.status(400).json({ message: 'trainerId, date e location são obrigatórios' });
				return;
			}

			// Deve ter studentId 
			if (!studentId) {
				res.status(400).json({ message: 'Deve fornecer studentId ' });
				return;
			}

			// Deve ter apenas um tipo de agendamento: subscriptionId ou singleWorkoutId
			if (!subscriptionId && !singleWorkoutId) {
				res.status(400).json({ message: 'Deve fornecer subscriptionId ou singleWorkoutId' });
				return;
			}

			if (subscriptionId && singleWorkoutId) {
				res.status(400).json({ message: 'Não pode ter subscriptionId e singleWorkoutId ao mesmo tempo' });
				return;
			}

			// Determina status de pagamento padrão
			const defaultPaymentStatus = subscriptionId ? 'paid' : 'pending';

			const appointmentData = {
				trainerId,
				location,
				date: new Date(date),
				notes: notes || '',
				status: 'pending', // Sempre inicia como pending (aguardando aceite do treinador)
				paymentStatus: defaultPaymentStatus,
				...(studentId && { studentId }),
				...(subscriptionId && { subscriptionId }),
				...(singleWorkoutId && { singleWorkoutId: parseInt(singleWorkoutId) }),
				...(defaultPaymentStatus === 'paid' && { paidAt: new Date() })
			};

			const appointment = await prisma.appointment.create({
				data: appointmentData,
				include: {
					trainer: {
						select: { id: true, name: true, username: true }
					},
					subscription: {
						select: { id: true, planPrice: true, plan: { select: { name: true } } }
					},
					singleWorkout: {
						select: { id: true, name: true, price: true, duration: true }
					}
				}
			});

			res.status(201).json(appointment);
		} catch (err) {
			console.log('Erro ao criar agendamento', err);
			res.status(500).json({ message: 'Erro ao criar agendamento', err });
		}
	}

	static async update(req: Request, res: Response): Promise<void> {
		try {
			const { id } = req.params;
			const data = req.body;

			const appointment = await prisma.appointment.findUnique({
				where: { id },
			});

			if (!appointment) {
				res.status(404).json({ message: 'Agendamento não encontrado' });
				return;
			}

			const updated = await prisma.appointment.update({
				where: { id },
				data,
				include: {
					trainer: {
						select: { id: true, name: true, username: true }
					},
					subscription: {
						select: { id: true, planPrice: true, plan: { select: { name: true } } }
					},
					singleWorkout: {
						select: { id: true, name: true, price: true, duration: true }
					}
				}
			});

			res.status(200).json(updated);
		} catch (err) {
			res.status(500).json({ message: 'Erro ao atualizar agendamento', err });
		}
	}

	static async delete(req: Request, res: Response): Promise<void> {
		try {
			const { id } = req.params;

			await prisma.appointment.delete({
				where: { id },
			});

			res.status(204).send();
		} catch (err) {
			res.status(500).json({ message: 'Erro ao deletar agendamento', err });
		}
	}

	// Métodos para controle de status pelo treinador
	static async acceptAppointment(req: Request, res: Response): Promise<void> {
		try {
			const { id } = req.params;
			const { trainerId } = req.body;

			const appointment = await prisma.appointment.findUnique({
				where: { id: id }
			});

			if (!appointment) {
				res.status(404).json({ message: 'Agendamento não encontrado' });
				return;
			}

			// Verifica se é o treinador correto
			if (appointment.trainerId !== trainerId) {
				res.status(403).json({ message: 'Apenas o treinador responsável pode aceitar este agendamento' });
				return;
			}

			// Verifica se ainda está pendente
			if (appointment.status !== 'pending') {
				res.status(400).json({ message: 'Este agendamento não está mais pendente de aceite' });
				return;
			}

			const updated = await prisma.appointment.update({
				where: { id },
				data: {
					status: 'accepted',
					acceptedAt: new Date()
				},
				include: {
					trainer: {
						select: { id: true, name: true, username: true }
					},
					subscription: {
						select: { id: true, planPrice: true, plan: { select: { name: true } } }
					},
					singleWorkout: {
						select: { id: true, name: true, price: true, duration: true }
					}
				}
			});

			res.status(200).json(updated);
		} catch (err) {
			res.status(500).json({ message: 'Erro ao aceitar agendamento', err });
		}
	}

	static async rejectAppointment(req: Request, res: Response): Promise<void> {
		try {
			const { id } = req.params;
			const { trainerId, rejectionReason } = req.body;

			const appointment = await prisma.appointment.findUnique({
				where: { id }
			});

			if (!appointment) {
				res.status(404).json({ message: 'Agendamento não encontrado' });
				return;
			}

			// Verifica se é o treinador correto
			if (appointment.trainerId !== trainerId) {
				res.status(403).json({ message: 'Apenas o treinador responsável pode rejeitar este agendamento' });
				return;
			}

			// Verifica se ainda está pendente
			if (appointment.status !== 'pending') {
				res.status(400).json({ message: 'Este agendamento não está mais pendente de aceite' });
				return;
			}

			const updated = await prisma.appointment.update({
				where: { id },
				data: {
					status: 'rejected',
					rejectedAt: new Date(),
					notes: rejectionReason ? `${appointment.notes}\n[REJEITADO]: ${rejectionReason}` : appointment.notes
				},
				include: {
					trainer: {
						select: { id: true, name: true, username: true }
					},
					subscription: {
						select: { id: true, planPrice: true, plan: { select: { name: true } } }
					},
					singleWorkout: {
						select: { id: true, name: true, price: true, duration: true }
					}
				}
			});

			res.status(200).json(updated);
		} catch (err) {
			res.status(500).json({ message: 'Erro ao rejeitar agendamento', err });
		}
	}

	// Métodos para controle de status da aula
	static async markAsCompleted(req: Request, res: Response): Promise<void> {
		try {
			const { id } = req.params;

			const appointment = await prisma.appointment.findUnique({
				where: { id },
			});

			if (!appointment) {
				res.status(404).json({ message: 'Agendamento não encontrado' });
				return;
			}

			// Verifica se a aula foi aceita pelo treinador
			if (appointment.status !== 'accepted') {
				res.status(400).json({ message: 'Apenas aulas aceitas podem ser marcadas como realizadas' });
				return;
			}

			const updated = await prisma.appointment.update({
				where: { id },
				data: {
					status: 'completed',
					completedAt: new Date()
				},
				include: {
					trainer: {
						select: { id: true, name: true, username: true }
					},
					subscription: {
						select: { id: true, planPrice: true, plan: { select: { name: true } } }
					},
					singleWorkout: {
						select: { id: true, name: true, price: true, duration: true }
					}
				}
			});

			res.status(200).json(updated);
		} catch (err) {
			res.status(500).json({ message: 'Erro ao marcar aula como realizada', err });
		}
	}

	static async markAsPaid(req: Request, res: Response): Promise<void> {
		try {
			const { id } = req.params;

			const appointment = await prisma.appointment.findUnique({
				where: { id },
			});

			if (!appointment) {
				res.status(404).json({ message: 'Agendamento não encontrado' });
				return;
			}

			const updated = await prisma.appointment.update({
				where: { id },
				data: {
					paymentStatus: 'paid',
					paidAt: new Date()
				},
				include: {
					trainer: {
						select: { id: true, name: true, username: true }
					},
					subscription: {
						select: { id: true, planPrice: true, plan: { select: { name: true } } }
					},
					singleWorkout: {
						select: { id: true, name: true, price: true, duration: true }
					}
				}
			});

			res.status(200).json(updated);
		} catch (err) {
			res.status(500).json({ message: 'Erro ao marcar pagamento como pago', err });
		}
	}
}