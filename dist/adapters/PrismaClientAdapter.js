import { PrismaClient } from '@prisma/client';

class PrismaClientAdapter {
  prisma;

  constructor() {
    this.prisma = new PrismaClient();
  }

  getModel(model) {
    const repository = this.prisma[model];
    if (!repository) {
      throw new Error(`Model ${String(model)} not found in PrismaClient.`);
    }
    return repository;
  }

  async findOne(model, where) {
    const repository = this.getModel(model);
    return repository.findUnique({ where });
  }

  async findMany(model, where = {}) {
    const repository = this.getModel(model);
    return repository.findMany({ where });
  }

  async create(model, data) {
    const repository = this.getModel(model);
    
    // Check if the username already exists
    const existingUser = await repository.findUnique({
      where: { username: data.username }
    });

    if (existingUser) {
      throw new Error('Username already exists');
    }

    return repository.create({
      data
    });
  }

  async update(model, where, data) {
    const repository = this.getModel(model);
    return repository.update({ where, data });
  }

  async delete(model, where) {
    const repository = this.getModel(model);
    return repository.delete({ where });
  }
}

export default PrismaClientAdapter;