import { Request, Response } from 'express';

import { supabase } from '@/lib/supabase';
import { PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';
import path from 'path';

const prisma = new PrismaClient();

export default class PaymentController {
	/**
	 * Criar nova aula avulsa
	 */
	static async createSingleWorkout(req: Request, res: Response) {
		try {
			const { userId, name, description, price, category, duration, isFree } = req.body;

			if (!userId || !name || !description) {
				console.log('Campos não preenchidos: ', userId, name, description);
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

			if (priceInCents <= 1000 && !isFree) {
				res.status(400).json({ message: 'O valor da aula avulsa deve ser maior que R$ 10,00.' });
				return;
			}

			// Verifica se já existe uma aula com o mesmo nome para este treinador
			const existingWorkout = await prisma.singleWorkout.findFirst({
				where: {
					trainerId: userId,
					name: name.trim(),
					isActive: true,
				},
			});

			if (existingWorkout) {
				res.status(400).json({ message: 'Já existe uma aula avulsa com este nome.' });
				return;
			}


			const imageUrlResult = await addExerciseImage(req.file);
			let imageUrl: string | null = null;

			if (typeof imageUrlResult === 'string') {
				imageUrl = imageUrlResult;
			} else if (imageUrlResult && imageUrlResult.error) {
				console.error(imageUrlResult.error);
				imageUrl = '';
			}

			const workout = await prisma.singleWorkout.create({
				data: {
					trainerId: userId,
					trainerUsername: user.username,
					name: name.trim(),
					description,
					price: priceInCents,
					category: category?.trim(),
					duration: duration ? parseInt(duration) : null,
					imageUrl
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
	 * Listar todas as aulas avulsas de um treinador
	 */
	static async getSingleWorkoutsByTrainer(req: Request, res: Response) {
		try {
			const { username } = req.params;
			const { category, isActive = 'true' } = req.query;

			const whereConditions: any = {
				trainerUsername: username,
				isActive: isActive === 'true',
			};

			if (category) {
				whereConditions.category = category;
			}

			const workouts = await prisma.singleWorkout.findMany({
				where: whereConditions,
				orderBy: {
					createdAt: 'desc',
				},
			});

			const workoutsWithFormattedPrice = workouts.map((workout) => ({
				...workout,
				priceFormatted: (workout.price / 100).toFixed(2),
			}));

			res.json(workoutsWithFormattedPrice);
		} catch (error: any) {
			console.error('Erro ao buscar aulas avulsas:', error.message);
			res.status(500).json({ message: 'Erro ao buscar aulas avulsas.' });
		}
	}

	/**
	 * Buscar uma aula avulsa específica
	 */
	static async getSingleWorkout(req: Request, res: Response) {
		try {
			const { workoutId } = req.params;

			const workout = await prisma.singleWorkout.findUnique({
				where: { id: parseInt(workoutId) },
				select: {
					id: true,
					name: true,
					description: true,
					price: true,
					category: true,
					duration: true,
					isActive: true,
					trainer: {
						select: {
							id: true,
							username: true,
							name: true,
							profile: {
								select: {
									avatar: true,
									description: true,
									rate: true,
									alunos: true,
									specialty: true,
								},
							},
						},
					},
				},
			});

			if (!workout) {
				res.status(404).json({ message: 'Aula avulsa não encontrada.' });
				return;
			}

			res.json(workout);
		} catch (error: any) {
			console.error('Erro ao buscar aula avulsa:', error.message);
			res.status(500).json({ message: 'Erro ao buscar aula avulsa.' });
		}
	}

	/**
	 * Atualizar aula avulsa
	 */
	static async updateSingleWorkout(req: Request, res: Response) {
		try {
			const { workoutId } = req.params;
			const { name, description, price, category, duration, isActive } = req.body;

			const existing = await prisma.singleWorkout.findUnique({
				where: { id: parseInt(workoutId) },
			});

			if (!existing) {
				res.status(404).json({ message: 'Aula avulsa não encontrada.' });
				return;
			}

			// Se está alterando o nome, verifica se já existe outro com o mesmo nome
			if (name && name.trim() !== existing.name) {
				const duplicateName = await prisma.singleWorkout.findFirst({
					where: {
						trainerId: existing.trainerId,
						name: name.trim(),
						isActive: true,
						id: { not: parseInt(workoutId) },
					},
				});

				if (duplicateName) {
					res.status(400).json({ message: 'Já existe uma aula avulsa com este nome.' });
					return;
				}
			}

			const updateData: any = {};

			if (name) updateData.name = name.trim();
			if (description) updateData.description = description;
			if (price) updateData.price = Math.floor(Number(price) * 100);
			if (category !== undefined) updateData.category = category?.trim();
			if (duration !== undefined) updateData.duration = duration ? parseInt(duration) : null;
			if (isActive !== undefined) updateData.isActive = isActive;

			const updated = await prisma.singleWorkout.update({
				where: { id: parseInt(workoutId) },
				data: updateData,
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
	 * Deletar aula avulsa
	 */
	static async deleteSingleWorkout(req: Request, res: Response) {
		try {
			const { workoutId } = req.params;

			const existing = await prisma.singleWorkout.findUnique({
				where: { id: parseInt(workoutId) },
			});

			if (!existing) {
				res.status(404).json({ message: 'Aula avulsa não encontrada.' });
				return;
			}

			// Verifica se existem agendamentos futuros
			const futureAppointments = await prisma.appointment.count({
				where: {
					singleWorkoutId: parseInt(workoutId),
					date: {
						gte: new Date(),
					},
				},
			});

			if (futureAppointments > 0) {
				// Em vez de deletar, desativa a aula se houver agendamentos futuros
				await prisma.singleWorkout.update({
					where: { id: parseInt(workoutId) },
					data: { isActive: false },
				});

				res.json({
					message: 'Aula avulsa desativada devido a agendamentos futuros existentes.',
					deactivated: true,
				});
				return;
			}

			await prisma.singleWorkout.delete({
				where: { id: parseInt(workoutId) },
			});

			res.json({ message: 'Aula avulsa excluída com sucesso.' });
		} catch (error: any) {
			console.error('Erro ao excluir aula avulsa:', error.message);
			res.status(500).json({ message: 'Erro ao excluir aula avulsa.' });
		}
	}

	/**
	 * Listar categorias de aulas avulsas de um treinador
	 */
	static async getSingleWorkoutCategories(req: Request, res: Response) {
		try {
			const { username } = req.params;

			const categories = await prisma.singleWorkout.groupBy({
				by: ['category'],
				where: {
					trainerUsername: username,
					isActive: true,
					category: {
						not: null,
					},
				},
				_count: {
					category: true,
				},
			});

			const formattedCategories = categories.map((cat) => ({
				name: cat.category,
				count: cat._count.category,
			}));

			res.json(formattedCategories);
		} catch (error: any) {
			console.error('Erro ao buscar categorias:', error.message);
			res.status(500).json({ message: 'Erro ao buscar categorias.' });
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
		.from('subscriptions-images')
		.upload(filePath, file.buffer, {
			contentType: file.mimetype,
			upsert: true,
		});

	if (uploadError) {
		console.error('Erro no upload de de imagem de exercício:', uploadError);
		return { error: 'Erro ao enviar imagem' };
	}

	const { data: publicData } = supabase.storage.from('subscriptions-images').getPublicUrl(uploadData.path);

	if (!publicData?.publicUrl) {
		return { error: 'Não foi possível obter URL da imagem' };
	}

	return publicData.publicUrl;
}
