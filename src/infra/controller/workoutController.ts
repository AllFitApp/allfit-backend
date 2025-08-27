import { Exercise, PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';

const prisma = new PrismaClient();

export class WorkoutController {
	// Criar plano semanal
	static async createWeeklyPlan(req: Request, res: Response) {
		try {
			const { trainerId, name, description, startDate, endDate, workoutSessions } = req.body;
			const workoutSessionIds = workoutSessions.map((session: { id: any; dayOfWeek: number; }) => session.id);

			const sessions = await prisma.workoutSession.findMany({
				where: {
					id: {
						in: workoutSessionIds
					}
				},
				include: { exercises: true }
			});

			const weeklyPlan = await prisma.weeklyPlan.create({
				data: {
					trainerId,
					name,
					description,
					startDate,
					endDate,
					workouts: {
						create: sessions.map((s) => ({
							trainerId,
							name: s.name,
							description: s.description,
							dayOfWeek: workoutSessionIds.indexOf(s.id).dayOfWeek,
							type: s.type,
							defaultRest: s.defaultRest,
							isCopy: true,
							exercises: {
								create: s.exercises.map((e: Exercise) => {
									const { id, ...rest } = e;
									return {
										...rest,
										isCopy: true
									};
								})
							}
						}))
					}
				},
				include: { workouts: { include: { exercises: true } } }
			});

			res.json(weeklyPlan);
		} catch (error) {
			console.error(error);
			res.status(500).json({ error: 'Erro ao criar plano semanal' });
		}
	}

	static async createWorkoutSession(req: Request, res: Response) {
		try {
			const { trainerId, name, description, defaultRest, exercisesId } = req.body;

			const exercises = await prisma.exercise.findMany({
				where: {
					id: {
						in: exercisesId
					}
				}
			});

			const session = await prisma.workoutSession.create({
				data: {
					trainerId,
					name,
					description,
					defaultRest,
					exercises: {
						create: exercises.map((e: Exercise) => {
							const { id, ...rest } = e;
							return {
								...rest,
								isCopy: true
							};
						})
					}
				},
				include: { exercises: true }
			});

			res.json(session);
		} catch (error) {
			console.error(error);
			res.status(500).json({ error: 'Erro ao criar sessão de aula avulsa' });
		}
	}
	/**
	 * Listar sessões de treino
	 */
	static async getWorkoutSession(req: Request, res: Response) {
		const { id } = req.params;

		try {
			const sessions = await prisma.workoutSession.findFirst({
				where: {
					OR: [
						{ id },
						{ appointmentId: id },
					],
					isCopy: true
				},
				include: { exercises: true }
			});

			res.json(sessions);
		} catch (error) {
			console.error(error);
			res.status(500).json({ error: 'Erro ao buscar sessões de treino' });
		}
	}
	static async getWorkoutSessionsByWeeklyPlan(req: Request, res: Response) {
		const { id } = req.params;

		try {
			const sessions = await prisma.workoutSession.findMany({
				where: {

					weeklyPlanId: id
					,
					isCopy: true
				},
				include: { exercises: true }
			});

			res.json(sessions);
		} catch (error) {
			console.error(error);
			res.status(500).json({ error: 'Erro ao buscar sessões de treino' });
		}
	}
	/**
	 * Listar sessões de treino de treinadores
	 */
	static async getWorkoutSessionsByTrainer(req: Request, res: Response) {
		const { trainerId } = req.params;
		console.log(trainerId);
		try {
			const sessions = await prisma.workoutSession.findMany({
				where: {
					trainerId,
					isCopy: null
				},
				include: { exercises: true }
			});

			res.json(sessions);
		} catch (error) {
			console.error(error);
			res.status(500).json({ error: 'Erro ao buscar sessões de treino' });
		}
	}
	/**
	 * Lista planos semanais criados pelo treinador (busca sem a flag de copy)
	 */
	static async getWeeklyPlansByTrainer(req: Request, res: Response) {
		try {
			const { trainerId } = req.params;

			const plans = await prisma.weeklyPlan.findMany({
				where: { trainerId, isCopy: null },
				include: {
					workouts: { include: { exercises: true } }
				}
			});

			res.json(plans);
		} catch (error) {
			console.error(error);
			res.status(500).json({ error: 'Erro ao buscar treinos' });
		}
	}
	static async getWeeklyPlansByStudent(req: Request, res: Response) {
		try {
			const { studentId } = req.params;

			const plans = await prisma.weeklyPlan.findMany({
				where: { studentId, isCopy: true },
				include: {
					workouts: { include: { exercises: true } }
				}
			});

			res.json(plans);
		} catch (error) {
			console.error(error);
			res.status(500).json({ error: 'Erro ao buscar treinos' });
		}
	}
	/**
	 * Atribuir plano ao aluno. O plano semanal previamente criado pelo treinador, será copiado para o aluno
	 */
	static async assignWeeklyPlanToStudent(req: Request, res: Response) {
		try {
			const { trainerId, studentId, weeklyPlanId } = req.body;

			const weeklyPlan = await prisma.weeklyPlan.findUnique({
				where: { id: weeklyPlanId },
				include: {
					workouts: { include: { exercises: true } }
				}
			});

			if (!weeklyPlan) {
				return res.status(404).json({ error: 'Plano semanal nao encontrado' });
			}

			const plan = await prisma.weeklyPlan.create({
				data: {
					trainerId,
					studentId,
					name: weeklyPlan?.name || '',
					description: weeklyPlan?.description,
					startDate: weeklyPlan?.startDate,
					endDate: weeklyPlan?.endDate,
					isCopy: true,
					workouts: {
						create: weeklyPlan?.workouts.map((w) => ({
							trainerId,
							name: w.name,
							description: w.description,
							dayOfWeek: w.dayOfWeek,
							type: w.type,
							defaultRest: w.defaultRest,
							isCopy: true,
							exercises: {
								create: w.exercises.map((e: Exercise) => {
									const { id, ...rest } = e;
									return {
										...rest,
										isCopy: true
									};
								})
							}
						}))
					}
				},
				include: { workouts: { include: { exercises: true } } }
			});
			res.json(plan);
		} catch (error) {
			console.error(error);
			res.status(500).json({ error: 'Erro ao atribuir plano ao aluno' });
		}
	}
	/**
	 * Atribuir sessão a agendamento. O workoutSession previamente criado pelo treinador, será copiado para o aluno
	 */
	static async assignSessionToAppointment(req: Request, res: Response) {
		try {
			const { sessionId, appointmentId } = req.body;

			const workoutSession = await prisma.workoutSession.findUnique({
				where: { id: sessionId },
				include: {
					exercises: true
				}
			});

			if (!workoutSession) {
				return res.status(404).json({ error: 'treino nao encontrado' });
			}

			const session = await prisma.workoutSession.create({
				data: {
					appointmentId,
					trainerId: workoutSession?.trainerId,
					name: workoutSession?.name || '',
					description: workoutSession?.description,
					type: workoutSession?.type,
					defaultRest: workoutSession?.defaultRest,
					isCopy: true,
					exercises: {
						create: workoutSession?.exercises.map((e: Exercise) => {
							const { id, ...rest } = e;
							return {
								...rest,
								isCopy: true
							};
						})
					}
				},
				include: { exercises: true }
			});
			res.json(session);
		} catch (error) {
			console.error(error);
			res.status(500).json({ error: 'Erro ao atribuir plano ao aluno' });
		}
	}

	// Atualizar sessão
	static async updateSession(req: Request, res: Response) {
		try {
			const { id } = req.params;
			const props = req.body;

			const session = await prisma.workoutSession.update({
				where: { id },
				data: { ...props },
				include: { exercises: true }
			});

			res.json(session);
		} catch (error) {
			console.error(error);
			res.status(500).json({ error: 'Erro ao atualizar sessão' });
		}
	}

	// Excluir sessão
	static async deleteSession(req: Request, res: Response) {
		try {
			const { id } = req.params;

			await prisma.workoutSession.delete({
				where: { id }
			});

			res.json({ message: 'Sessão excluída com sucesso' });
		} catch (error) {
			console.error(error);
			res.status(500).json({ error: 'Erro ao excluir sessão' });
		}
	}
}
