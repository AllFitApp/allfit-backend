import { prisma } from '@/adapters/prismaClient';

export async function activatePlan(trainerId: string, planId: string) {
	if (!trainerId || !planId) {
		throw new Error('Nao foi possivel ativar o plano.');
	}

	const plan = await prisma.plan.findUnique({ where: { id: planId } });
	if (!plan) {
		throw new Error('Plano nao encontrado.');
	}
	const updatedPlan = await prisma.plan.update({ where: { id: planId }, data: { isActive: true } });
	return updatedPlan;
}
