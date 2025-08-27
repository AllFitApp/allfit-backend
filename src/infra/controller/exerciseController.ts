import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';

const prisma = new PrismaClient();

export class ExerciseController {
	// Criar exercício
	static async createExercise(req: Request, res: Response) {
		try {
			const { trainerId, name, description, series, reps, rest, weight, type, timing } = req.body;

			const exercise = await prisma.exercise.create({
				data: {
					trainerId,
					name,
					description,
					series,
					reps: reps ? Number(reps) : null,
					rest,
					weight: weight ? Number(weight) : null,
					type,
					timing: timing ? Number(timing) : null,
				}
			});

			res.json(exercise);
		} catch (error) {
			console.error(error);
			res.status(500).json({ error: 'Erro ao criar exercício' });
		}
	}

	// Listar exercícios de um treinador
	static async getExercisesByTrainer(req: Request, res: Response) {
		try {
			const { trainerId } = req.params;

			const exercises = await prisma.exercise.findMany({
				where: { trainerId, isCopy: null }
			});

			res.json(exercises);
		} catch (error) {
			console.error(error);
			res.status(500).json({ error: 'Erro ao buscar exercícios' });
		}
	}

	// Atualizar exercício
	static async updateExercise(req: Request, res: Response) {
		try {
			const { id } = req.params;
			const { name, description, series, reps, rest, weight, type, timing } = req.body;

			const exercise = await prisma.exercise.update({
				where: { id },
				data: { name, description, series, reps, rest, weight, type, timing }
			});

			res.json(exercise);
		} catch (error) {
			console.error(error);
			res.status(500).json({ error: 'Erro ao atualizar exercício' });
		}
	}

	// Deletar exercício
	static async deleteExercise(req: Request, res: Response) {
		try {
			const { id } = req.params;

			await prisma.exercise.delete({
				where: { id }
			});

			res.json({ message: 'Exercício excluído com sucesso' });
		} catch (error) {
			console.error(error);
			res.status(500).json({ error: 'Erro ao excluir exercício' });
		}
	}
}
