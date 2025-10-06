import { supabase } from '@/lib/supabase';
import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import { ProfileRepository } from '../repository/ProfileRepository';

import path from 'path';

const prisma = new PrismaClient();

export default class ProfileController {
	private static profileRepository = new ProfileRepository();

	static async getUserByUsername(req: Request, res: Response): Promise<void> {
		try {
			const { username } = req.params;

			// Verifica se o perfil existe
			const profile = await prisma.profile.findUnique({
				where: { username: username },
				include: { user: { select: { id: true, role: true } } },
			});

			if (!profile) {
				// Se não houver perfil, buscar informações básicas do usuário
				const user = await prisma.user.findUnique({ where: { username } });

				if (!user) {
					res.status(404).json({ message: 'User not found' });
					return;
				}

				res.status(200).json({
					username: user.username,
					firstAccess: true,
					name: user.name,
					alunos: user,
					description: '',
					niche: '',
					followers: 0,
					rate: 0,
					avatar: '',
				});
				return;
			}

			res.status(200).json(profile);
		} catch (err) {
			res.status(500).json({ message: 'Error fetching profile', err });
		}
	}

	static async updateAvatar(req: Request, res: Response): Promise<void> {
		try {
			const { id } = req.params;
			if (!req.file) {
				res.status(400).json({ message: 'Nenhuma imagem enviada' });
				return;
			}

			const fileExt = path.extname(req.file.originalname);
			const fileName = `avatar-${Date.now()}${fileExt}`;
			const filePath = fileName;

			const { data: uploadData, error: uploadError } = await supabase.storage
				.from('profiles-avatars')
				.upload(filePath, req.file.buffer, {
					contentType: req.file.mimetype,
					upsert: true,
				});

			if (uploadError) {
				console.error('Erro no upload de avatar:', uploadError);
				res.status(500).json({ message: 'Erro ao enviar avatar' });
				return;
			}

			const { data: publicData } = supabase.storage.from('profiles-avatars').getPublicUrl(uploadData.path);

			if (!publicData?.publicUrl) {
				res.status(500).json({ message: 'Não foi possível obter URL do avatar' });
				return;
			}

			const updatedProfile = await prisma.profile.update({
				where: { id },
				data: {
					avatar: publicData.publicUrl,
				},
			});

			res.status(200).json({ profile: updatedProfile });
		} catch (err) {
			console.error('Erro ao atualizar avatar:', err);
			if (!res.headersSent) {
				res.status(500).json({ message: 'Erro ao atualizar avatar', err });
			}
		}
	}

	static async updateMartketImage(req: Request, res: Response): Promise<void> {
		try {
			const { id } = req.params;
			if (!req.file) {
				res.status(400).json({ message: 'Nenhuma imagem enviada' });
				return;
			}

			const fileExt = path.extname(req.file.originalname);
			const fileName = `market-${Date.now()}${fileExt}`;
			const filePath = fileName;

			const { data: uploadData, error: uploadError } = await supabase.storage
				.from('market-image')
				.upload(filePath, req.file.buffer, {
					contentType: req.file.mimetype,
					upsert: true,
				});

			if (uploadError) {
				console.error('Erro no upload de imagem:', uploadError);
				res.status(500).json({ message: 'Erro ao enviar imagem' });
				return;
			}

			const { data: publicData } = supabase.storage.from('market-image').getPublicUrl(uploadData.path);

			if (!publicData?.publicUrl) {
				res.status(500).json({ message: 'Não foi possível obter URL do avatar' });
				return;
			}

			const updatedProfile = await prisma.profile.update({
				where: { id },
				data: {
					marketImage: publicData.publicUrl,
				},
			});

			res.status(200).json({ profile: updatedProfile });
		} catch (err) {
			console.error('Erro ao atualizar market image:', err);
			if (!res.headersSent) {
				res.status(500).json({ message: 'Erro ao atualizar market image', err });
			}
		}
	}

	static async createProfile(req: Request, res: Response): Promise<void> {
		try {
			const { id } = req.params;
			const profileData = req.body;

			const profile = await this.profileRepository.createProfileFromUser(id, profileData);

			// const profile = await prisma.profile.create({
			// 	data: {
			// 		username: username,
			// 		...profileData,
			// 	},
			// });

			res.status(201).json({ profile });
		} catch (err) {
			res.status(500).json({ message: 'Error creating profile', err });
		}
	}

	static async updateProfile(req: Request, res: Response): Promise<void> {
		try {
			const { id } = req.params;
			const updateData = req.body;

			const profile = await prisma.profile.update({
				where: { id: id },
				data: updateData,
			});

			res.status(200).json({ profile });
		} catch (err) {
			console.log(err);
			res.status(500).json({ message: 'Error updating profile', err });
		}
	}

	static async listUsers(req: Request, res: Response): Promise<void> {
		try {
			const users = await prisma.profile.findMany({
				where: { user: { role: 'USER' } },
			});
			res.status(200).json(users);
		} catch (err) {
			res.status(500).json({ message: 'Error fetching users', err });
		}
	}

	static async listTrainers(req: Request, res: Response): Promise<void> {
		try {
			const { search, limit, page } = req.query;

			// Parâmetros de paginação
			const limitNumber = limit ? parseInt(limit as string, 10) : 10; // Padrão: 10 itens
			const pageNumber = page ? parseInt(page as string, 10) : 1; // Padrão: página 1
			const offset = (pageNumber - 1) * limitNumber;

			// Valida os parâmetros de paginação
			if (limitNumber <= 0 || pageNumber <= 0) {
				res.status(400).json({
					message: 'Os parâmetros limit e page devem ser números positivos',
				});
				return;
			}

			// Constrói o filtro base
			const whereClause: any = {
				user: { role: 'TRAINER' },
			};

			if (search && typeof search === 'string' && search.trim() !== '') {
				const searchTerm = search.trim();

				whereClause.AND = [
					{ user: { role: 'TRAINER' } },
					{
						OR: [
							// Busca no nome do perfil
							{
								name: {
									contains: searchTerm,
									mode: 'insensitive',
								},
							},
							// Busca no username do usuário
							{
								user: {
									username: {
										contains: searchTerm,
										mode: 'insensitive',
									},
									role: 'TRAINER',
								},
							},
							{
								specialty: {
									contains: searchTerm,
									mode: 'insensitive',
								},
							},
						],
					},
				];
			}

			// Busca os trainers com paginação
			const [trainers, totalCount] = await Promise.all([
				prisma.profile.findMany({
					where: whereClause,
					include: {
						user: {
							select: {
								username: true,
								email: true,
							},
						},
					},
					orderBy: [{ name: 'asc' }],
					skip: offset,
					take: limitNumber,
				}),
				// Conta o total de registros para informações de paginação
				prisma.profile.count({
					where: whereClause,
				}),
			]);

			// Calcula informações de paginação
			const totalPages = Math.ceil(totalCount / limitNumber);
			const hasNextPage = pageNumber < totalPages;
			const hasPreviousPage = pageNumber > 1;

			res.status(200).json({
				data: trainers,
				pagination: {
					currentPage: pageNumber,
					totalPages,
					totalItems: totalCount,
					itemsPerPage: limitNumber,
					hasNextPage,
					hasPreviousPage,
				},
			});
		} catch (err) {
			console.error('Error fetching trainers:', err);
			res.status(500).json({ message: 'Error fetching trainers', err });
		}
	}
}
