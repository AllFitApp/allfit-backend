import { supabase } from '@/lib/supabase';
import { PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';
import { Request, Response } from 'express';

import path from 'path';

const prisma = new PrismaClient();

export class ExerciseController {
	// Criar exercício
	static async createExercise(req: Request, res: Response) {
		try {
			const { trainerId, name, description, series, reps, rest, weight, type, timing } = req.body;

			const imageUrlResult = await addExerciseImage(req.file);
			let imageUrl: string | null = null;

			if (typeof imageUrlResult === 'string') {
				imageUrl = imageUrlResult;
			} else if (imageUrlResult && imageUrlResult.error) {
				console.error(imageUrlResult.error);
				imageUrl = '';
			}
			console.log('series', series);
			const exercise = await prisma.exercise.create({
				data: {
					trainerId,
					name,
					description,
					series: Number(series),
					reps: reps ? Number(reps) : null,
					rest: Number(rest),
					weight: weight ? Number(weight) : null,
					type,
					timing: timing ? Number(timing) : null,
					imageUrl: imageUrl
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

async function addExerciseImage(file: Express.Multer.File | undefined) {
	if (!file) return;
	if (file.size > 10 * 1024 * 1024) return { error: 'Tamanho da imagem excedeu o limite de 10mb' };

	const fileExt = path.extname(file.originalname);
	const fileName = `exercise-${dayjs()}${fileExt}`;
	const filePath = fileName;

	const { data: uploadData, error: uploadError } = await supabase.storage
		.from('exercise-images')
		.upload(filePath, file.buffer, {
			contentType: file.mimetype,
			upsert: true,
		});

	if (uploadError) {
		console.error('Erro no upload de de imagem de exercício:', uploadError);
		return { error: 'Erro ao enviar imagem' };
	}

	const { data: publicData } = supabase.storage.from('exercise-images').getPublicUrl(uploadData.path);

	if (!publicData?.publicUrl) {
		return { error: 'Não foi possível obter URL da imagem' };
	}

	return publicData.publicUrl;
}