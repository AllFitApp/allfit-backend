import { PlanController } from '@/providers/api/routers/plans/planController';
import { Router } from 'express';

const planRouter = Router();
const planController = new PlanController();

planRouter.get('/inactives/:trainerId', planController.getInactivePlans);

planRouter.patch('/activate/:trainerId/:planId', planController.activatePlan);

export default planRouter;
