import { PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';
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
				duration,
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

			if (!duration) {
				res.status(400).json({ message: 'Deve fornecer duração ' });
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
				duration: parseInt(duration),
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
	/**
 * Retorna os horários disponíveis para um treinador em uma data específica
 */
	static async getAvailableTimes(req: Request, res: Response): Promise<void> {
		const { trainerId, date } = req.params;
		const { duration } = req.query; // Duração em minutos

		if (!duration) {
			res.status(400).json({ message: 'Duração do agendamento é obrigatória' });
			return;
		}
		// Validar formato da data
		const targetDate = dayjs(date);
		if (!targetDate.isValid()) {
			throw new Error('Data inválida. Use o formato YYYY-MM-DD');
		}

		// Validar duração
		const appointmentDuration = duration ? parseInt(duration as string) : 60; // Default 60 minutos
		if (appointmentDuration <= 0 || appointmentDuration > 480) { // Máximo 8 horas
			res.status(400).json({ message: 'Duração inválida. Deve ser entre 1 e 480 minutos' });
			return;
		}

		// Buscar configurações de horário do treinador
		const trainerHorarios = await prisma.trainerHorarios.findUnique({
			where: { trainerId }
		});

		if (!trainerHorarios || !trainerHorarios.horarios) {
			res.status(404).json({ message: 'Horários do treinador não encontrados' });
			return;
		}

		// Obter dia da semana (0 = domingo)
		const dayOfWeek = targetDate.day();

		// Encontrar configuração para o dia da semana
		const dayConfig = (trainerHorarios.horarios as any[])
			.find(config => config.day === dayOfWeek);

		if (!dayConfig || !dayConfig.intervals.length) {
			res.status(404).json({ message: 'Configuração de horário para o dia da semana nao encontrada' });
			return;
		}

		// Buscar agendamentos existentes para o dia
		const startOfDay = targetDate.startOf('day').toDate();
		const endOfDay = targetDate.endOf('day').toDate();

		const existingAppointments = await prisma.appointment.findMany({
			where: {
				trainerId,
				date: {
					gte: startOfDay,
					lte: endOfDay
				},
				status: {
					in: ['pending', 'accepted']
				}
			},
			select: {
				date: true,
				duration: true
			}
		});

		// Gerar todos os slots de 30 minutos possíveis baseados nos intervalos configurados
		const availableSlots: string[] = [];

		dayConfig.intervals.forEach((interval: any) => {
			const startHour = interval.start;
			const endHour = interval.end;

			// Gerar slots de 30 em 30 minutos
			for (let hour = startHour; hour < endHour; hour++) {
				// Adicionar slot no início da hora (ex: 8:00)
				availableSlots.push(`${hour.toString().padStart(2, '0')}:00`);

				// Adicionar slot na metade da hora (ex: 8:30) se não ultrapassar o fim do intervalo
				if (hour + 0.5 < endHour) {
					availableSlots.push(`${hour.toString().padStart(2, '0')}:30`);
				}
			}
		});

		// Filtrar slots que conflitam com agendamentos existentes OU que não permitem completar a aula
		const availableTimes = availableSlots.filter(timeSlot => {
			const slotDateTime = dayjs(`${date} ${timeSlot}`, 'YYYY-MM-DD HH:mm');
			const appointmentEndTime = slotDateTime.add(appointmentDuration, 'minute');

			// 1. Verificar se o agendamento pode ser completado dentro dos intervalos de trabalho
			const canCompleteWithinWorkingHours = dayConfig.intervals.some((interval: any) => {
				const intervalStart = dayjs(`${date} ${interval.start.toString().padStart(2, '0')}:00`, 'YYYY-MM-DD HH:mm');
				const intervalEnd = dayjs(`${date} ${interval.end.toString().padStart(2, '0')}:00`, 'YYYY-MM-DD HH:mm');

				// Verificar se o agendamento começa e termina dentro deste intervalo
				return (slotDateTime.isAfter(intervalStart) || slotDateTime.isSame(intervalStart)) &&
					(appointmentEndTime.isBefore(intervalEnd) || appointmentEndTime.isSame(intervalEnd));
			});

			if (!canCompleteWithinWorkingHours) {
				return false;
			}

			// 2. Verificar se este slot conflita com algum agendamento existente
			const hasConflict = existingAppointments.some(appointment => {
				const appointmentStart = dayjs(appointment.date);
				const existingAppointmentDuration = appointment.duration || 60;
				const appointmentEnd = appointmentStart.add(existingAppointmentDuration, 'minute');

				// Verificar se há sobreposição entre o novo agendamento e o existente
				return (
					slotDateTime.isBefore(appointmentEnd) &&
					appointmentEndTime.isAfter(appointmentStart)
				);
			});

			return !hasConflict;
		});

		// Remover horários que já passaram (se for hoje)
		const now = dayjs();
		const finalAvailableTimes = availableTimes.filter(timeSlot => {
			const slotDateTime = dayjs(`${date} ${timeSlot}`, 'YYYY-MM-DD HH:mm');

			// Se for hoje, só mostrar horários futuros (considerando também o tempo para completar a aula)
			if (targetDate.isSame(now, 'day')) {
				return slotDateTime.isAfter(now);
			}

			// Se for data futura, mostrar todos
			return targetDate.isAfter(now, 'day');
		});

		res.status(200).json(finalAvailableTimes);
	}
}

// Exemplo de uso:
/*
const availableTimes = await getAvailableTimes({
	trainerId: 'trainer-uuid',
	date: '2025-09-08',
	timeZone: 'America/Sao_Paulo'
}, prisma)

console.log(availableTimes)
// Output exemplo: ['08:00', '08:30', '09:00', '09:30', '14:00', '14:30', '15:00']
*/
