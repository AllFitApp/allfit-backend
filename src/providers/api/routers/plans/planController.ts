import { Request, Response } from 'express';

import { activatePlan } from './useCases/activatePlan';
import { getInactivePlans } from './useCases/getInactivePlans';

export class PlanController {
	async getInactivePlans(req: Request, res: Response) {
		const inactivePlans = await getInactivePlans(req.params.trainerId);

		return res.status(200).json(inactivePlans);
	}
	async activatePlan(req: Request, res: Response) {
		const inactivePlans = await activatePlan(req.params.trainerId, req.params.planId);

		return res.status(200).json(inactivePlans);
	}
}
