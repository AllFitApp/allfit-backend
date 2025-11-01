import { PrismaClient } from '@prisma/client';
import { compare, hash } from 'bcrypt';
import { Request, Response } from 'express';
import { sign } from 'jsonwebtoken';

import { ProfileRepository } from '../repository/ProfileRepository';
import UserRepository from '../repository/UserRepository';
import CustomerController from './CustomerController';

const prisma = new PrismaClient();
const tokenSecret = process.env.SECRET as string;

export default class AuthController {
	private static userRepository = new UserRepository();
	private static profileRepository = new ProfileRepository();

	static async signUp(req: Request, res: Response): Promise<void> {
		try {
			const { email, password, name, username, number, role, cpf } = req.body;
			if (!email || !password || !name || !username || !number || !role || !cpf) {
				res.status(400).json({ message: 'Campos obrigatórios não fornecidos' });
				return;
			}
			console.log(cpf);
			const userExists = await prisma.user.findUnique({
				where: { email: email.toString().toLowerCase().trim() },
			});

			if (userExists) {
				res.status(401).json({ message: 'User already exists' });
				return;
			}

			const hashedPassword = await hash(password, 8);

			const createdUser = {
				name: name.toString().trim(),
				username: username.toString().toLowerCase().trim(),
				password: hashedPassword,
				number: number.toString().trim(),
				email: email.toString().toLowerCase().trim(),
				role: role,
				cpf: cpf.toString().trim().match(/\d/g)?.join(''),
			};

			const user = await prisma.user.create({ data: createdUser });

			await AuthController.profileRepository.createProfileFromUser(user.id, {});

			if (role === 'USER') {
				const customer = await CustomerController.createCustomer({ userId: user.id });

				if (!customer.data.user) {
					await prisma.user.delete({ where: { id: user.id } });
					console.log('Error creating customer', customer.data);
					res.status(500).json({ message: 'Error creating customer' });
					return;
				}
			}
			res.status(200).json({ user });
		} catch (err) {
			console.log(err);
			res.status(500).json({ message: 'Error signing up', err });
		}
	}

	static async login(req: Request, res: Response): Promise<void> {
		try {
			const { email, password } = req.body;

			const user = await prisma.user.findUnique({
				where: {
					email: email.toString().toLowerCase().trim(),
				},
			});

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
				return;
			}

			const token = sign(
				{ id: user.id, profileId: profile.id, username: user.username, role: user.role },
				tokenSecret,
				{
					expiresIn: '7d',
				}
			);

			res.status(200).json({ token, user: { username: user.username } });
		} catch (err) {
			console.log('LOGIN failed', err);
			res.status(500).json({ message: 'Error logging in', err });
		}
	}
}
