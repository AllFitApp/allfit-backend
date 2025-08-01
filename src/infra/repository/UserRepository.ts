import { User as userPrisma } from '@prisma/client';
import { PrismaClientAdapter } from '../../adapters/PrismaClientAdapter';
import User from '../../domain/entity/User';

export default class UserRepository {
	private prismaClient: PrismaClientAdapter;
	private model = 'User';

	constructor() {
		this.prismaClient = new PrismaClientAdapter();
	}

	async findByEmail(email: string): Promise<User | null> {
		const userFound: userPrisma | null = await this.prismaClient.findOne(this.model, { where: email });
		if (!userFound) {
			return null;
		}
		return new User(
			userFound.id,
			userFound.name,
			userFound.username,
			userFound.password,
			userFound.number,
			userFound.email,
			userFound.role,
			userFound.cpf || ''
		);
	}

	async save(user: User) {
		const userCreated: userPrisma = await this.prismaClient.create(this.model, {
			id: user.id,
			name: user.name,
			username: user.username,
			password: user.password,
			number: user.number,
			email: user.email,
			role: user.role,
			cpf: user.cpf,
		});
		return userCreated;
	}
}
