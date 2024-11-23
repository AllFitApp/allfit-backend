// src/interfaces/IDatabaseClient.ts
export interface IDatabaseClient {
  findOne<T>(model: string, where: Record<string, any>): Promise<T | null>;
  findMany<T>(model: string, where?: Record<string, any>): Promise<T[]>;
  create<T>(model: string, data: Record<string, any>): Promise<T>;
  update<T>(model: string, where: Record<string, any>, data: Record<string, any>): Promise<T>;
  delete<T>(model: string, where: Record<string, any>): Promise<void>;
}
