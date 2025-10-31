import { prisma } from '@/adapters/prismaClient';

export async function getInactivePlans(trainerId: string) {
	const plans = await prisma.plan.findMany({
		where: {
			trainerId,
			isActive: false,
			subscriptions: {
				some: {
					status: 'ACTIVE',
				},
			},
		},
		select: {
			id: true,
			name: true,
			price: true,
			imageUrl: true,
			description: true,
			features: true,
			subscriptions: {
				where: {
					status: 'ACTIVE',
				},
				select: {
					endDate: true,
					startDate: true,
					status: true,
					user: {
						select: {
							name: true,
							username: true,
						},
					},
				},
			},
		},
	});
	return plans;
}
