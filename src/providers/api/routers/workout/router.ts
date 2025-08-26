import { WorkoutController } from '@/infra/controller/workoutController';
import { Router } from 'express';

const workoutRouter = Router();

// Criar plano semanal
workoutRouter.post('/weekly-plan', WorkoutController.createWeeklyPlan);

// Criar sessão avulsa
workoutRouter.post('/create-session', WorkoutController.createWorkoutSession);

// Buscar planos semanais de um treinador (sem copy)
workoutRouter.get('/trainer/:trainerId', WorkoutController.getWeeklyPlansByTrainer);

// Buscar planos semanais de um aluno
workoutRouter.get('/student/:studentId', WorkoutController.getWeeklyPlansByStudent);

// Atribuir plano a um aluno (copia plano existente)
workoutRouter.post('/assign-student', WorkoutController.assignWeeklyPlanToStudent);

// Atualizar sessão
workoutRouter.put('/session/:id', WorkoutController.updateSession);

// Excluir sessão
workoutRouter.delete('/session/:id', WorkoutController.deleteSession);

export { workoutRouter };

