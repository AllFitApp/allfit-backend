import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';

const prisma = new PrismaClient();

export default class AppointmentController {
	static async addTrainerSchedule(req: Request, res: Response): Promise<void> {
		try {
			const { id, horarios, savedLocations, defaultLocationConfig } = req.body;

			console.log(savedLocations, defaultLocationConfig);
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
			const { id } = req.params;

			const schedule = await prisma.trainerHorarios.findUnique({
				where: { trainerId: id },
			});

			if (!schedule) {
				res.status(404).json({ message: 'Agenda não encontrada' });
				return;
			}

			res.status(200).json(schedule);
		} catch (err) {
			console.error('Erro ao buscar agenda do treinador:', err);
			res.status(500).json({ message: 'Erro ao buscar agenda', err });
		}
	}

	static async getAll(req: Request, res: Response): Promise<void> {
		try {
			const appointments = await prisma.appointment.findMany({
				orderBy: { date: 'asc' },
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
				where: { id: Number(id) },
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
			const { year, month } = req.params;

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
					date: {
						gte: startDate,
						lte: endDate,
					},
				},
				orderBy: { date: 'asc' },
			});

			res.status(200).json(appointments);
		} catch (err) {
			res.status(500).json({ message: 'Erro ao buscar agendamentos do mês', err });
		}
	}

	static async create(req: Request, res: Response): Promise<void> {
		try {
			const {
				studentName,
				workoutType,
				location,
				time, // HH:mm - pode ser validado na camada de aplicação
				date,
				duration, // em minutos
				notes,
				trainerId,
			} = req.body;

			if (!studentName || !workoutType || !time || !date) {
				res.status(400).json({ message: 'Todos os campos obrigatórios devem ser fornecidos' });
				return;
			}
			const appointment = await prisma.appointment.create({
				data: { trainerId, studentName, workoutType, location, time, date, duration, notes },
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

			const existing = await prisma.appointment.findUnique({
				where: { id: Number(id) },
			});

			if (!existing) {
				res.status(404).json({ message: 'Agendamento não encontrado' });
				return;
			}

			const updated = await prisma.appointment.update({
				where: { id: Number(id) },
				data,
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
				where: { id: Number(id) },
			});

			res.status(204).send();
		} catch (err) {
			res.status(500).json({ message: 'Erro ao deletar agendamento', err });
		}
	}
}
