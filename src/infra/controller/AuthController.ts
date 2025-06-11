import { PrismaClient } from '@prisma/client';
import { compare, hash } from 'bcrypt';
import { Request, Response } from 'express';
import { sign } from 'jsonwebtoken';
import User from '../../domain/entity/User';
import { ProfileRepository } from '../repository/ProfileRepository';
import UserRepository from '../repository/UserRepository';

const prisma = new PrismaClient();
const tokenSecret = process.env.SECRET as string;

export default class AuthController {
	private static userRepository = new UserRepository();
	private static profileRepository = new ProfileRepository();

	static async signUp(req: Request, res: Response): Promise<void> {
		try {
			const { email, password, name, username, number, role } = req.body;
			const userExists = await prisma.user.findUnique({ where: { email } });

			if (userExists) {
				res.status(401).json({ message: 'User already exists' });
				return;
			}

			const hashedPassword = await hash(password, 8);

			const createdUser = new User(name, username, hashedPassword, number, email, role);
			const user = await AuthController.userRepository.save(createdUser);
			const profile = await AuthController.profileRepository.createProfileFromUser(user.id, {});

			res.status(200).json({ user });
		} catch (err) {
			console.log(err);
			res.status(500).json({ message: 'Error signing up', err });
		}
	}

	static async login(req: Request, res: Response): Promise<void> {
		try {
			const { email, password } = req.body;

			const user = await prisma.user.findUnique({ where: { email } });

			if (!user) {
				res.status(404).json({ message: 'User not found' });
				return;
			}
			const profile = await prisma.profile.findUnique({ where: { username: user.username } });

			if (!profile) {
				res.status(404).json({ message: 'Profile not found' });
				return;
			}

			const isValidPassword = await compare(password, user.password);

			if (!isValidPassword) {
				res.status(401).json({ message: 'Invalid password' });
				return; // Agora interrompe a execução corretamente
			}

			const token = sign({ id: user.id, profileId: profile.id }, tokenSecret, {
				expiresIn: '7d',
			});

			res.status(200).json({ token, user: { username: user.username } });
		} catch (err) {
			console.log('LOGIN failed', err);
			res.status(500).json({ message: 'Error logging in', err });
		}
	}
}
