import { PrismaClient } from "@prisma/client";
import { IDatabaseClient } from "../interfaces/IDatabaseClient";

type PrismaModels = {
  [K in keyof PrismaClient]: PrismaClient[K] extends { findUnique: any }
    ? PrismaClient[K]
    : never;
};

export class PrismaClientAdapter implements IDatabaseClient {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  private getModel<T>(model: keyof PrismaModels): any {
    const repository = this.prisma[model];
    if (!repository) {
      throw new Error(`Model ${String(model)} not found in PrismaClient.`);
    }
    return repository;
  }

  async findOne<T>(model: string, where: Record<string, any>): Promise<T | null> {
    const repository = this.getModel(model as keyof PrismaModels);
    return repository.findUnique({ where }) as Promise<T | null>;
  }

  async findMany<T>(model: string, where: Record<string, any> = {}): Promise<T[]> {
    const repository = this.getModel(model as keyof PrismaModels);
    return repository.findMany({ where }) as Promise<T[]>;
  }

  async create<T>(model: string, data: Record<string, any>): Promise<T> {
    const repository = this.getModel(model as keyof PrismaModels);
    return repository.create({ data }) as Promise<T>;
  }

  async update<T>(
    model: string,
    where: Record<string, any>,
    data: Record<string, any>
  ): Promise<T> {
    const repository = this.getModel(model as keyof PrismaModels);
    return repository.update({ where, data }) as Promise<T>;
  }

  async delete<T>(model: string, where: Record<string, any>): Promise<void> {
    const repository = this.getModel(model as keyof PrismaModels);
    await repository.delete({ where });
  }
}
