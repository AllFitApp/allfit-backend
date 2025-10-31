import { User } from '@prisma/client';
import { PrismaClientAdapter } from '../../adapters/PrismaClientAdapter';

export default class UserRepository {
	private prismaClient: PrismaClientAdapter;
	private model = 'User';

	constructor() {
		this.prismaClient = new PrismaClientAdapter();
	}

	async save(user: User) {
		const userCreated: User = await this.prismaClient.create(this.model, {
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
