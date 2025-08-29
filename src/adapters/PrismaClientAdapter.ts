import { PrismaClient } from "@prisma/client";
import { IDatabaseClient } from "../interfaces/IDatabaseClient";
import { prisma } from './prismaClient';

type PrismaModels = {
	[K in keyof PrismaClient]: PrismaClient[K] extends { findUnique: any; }
	? PrismaClient[K]
	: never;
};

export class PrismaClientAdapter implements IDatabaseClient {
	private prisma = prisma; // usa instância global

	private getModel<T>(model: keyof PrismaModels): any {
		const repository = this.prisma[model];
		if (!repository) {
			throw new Error(`Model ${String(model)} not found in PrismaClient.`);
		}
		return repository;
	}

	async findOne<T>(model: string, where: Record<string, any>): Promise<T | null> {
		return this.getModel(model as keyof PrismaModels).findUnique({ where }) as Promise<T | null>;
	}

	async findMany<T>(model: string, where: Record<string, any> = {}): Promise<T[]> {
		return this.getModel(model as keyof PrismaModels).findMany({ where }) as Promise<T[]>;
	}

	async create<T>(model: string, data: Record<string, any>): Promise<T> {
		return this.getModel(model as keyof PrismaModels).create({ data }) as Promise<T>;
	}

	async update<T>(model: string, where: Record<string, any>, data: Record<string, any>): Promise<T> {
		return this.getModel(model as keyof PrismaModels).update({ where, data }) as Promise<T>;
	}

	async delete<T>(model: string, where: Record<string, any>): Promise<void> {
		await this.getModel(model as keyof PrismaModels).delete({ where });
	}
}
