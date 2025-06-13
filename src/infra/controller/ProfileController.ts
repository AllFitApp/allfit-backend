import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import { ProfileRepository } from '../repository/ProfileRepository';

const prisma = new PrismaClient();

export default class ProfileController {
	private static profileRepository = new ProfileRepository();

	static async getUserByUsername(req: Request, res: Response): Promise<void> {
		try {
			const { username } = req.params;

			// Verifica se o perfil existe
			const profile = await prisma.profile.findUnique({ where: { username: username } });

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

	// Novo método para atualizar o perfil do usuário
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
}
