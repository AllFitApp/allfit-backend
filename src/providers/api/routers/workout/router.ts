import { WorkoutController } from '@/infra/controller/workoutController';
import { Router } from 'express';

const workoutRouter = Router();

// Criar plano semanal
workoutRouter.post('/weekly-plan', WorkoutController.createWeeklyPlan);

// Criar sessão de treino
workoutRouter.post('/create-session', WorkoutController.createWorkoutSession);
workoutRouter.get('/:id', WorkoutController.getWorkoutSession);
workoutRouter.get('/:trainerId/trainer', WorkoutController.getWorkoutSessionsByTrainer);


// workoutRouter.get('/weekly-plan/', WorkoutController.getWorkoutSessionsByWeeklyPlan);
workoutRouter.get('/weekly-plan/:id', WorkoutController.getWorkoutSessionsByWeeklyPlan);
// Buscar planos semanais de um treinador (sem copy)
workoutRouter.get('/trainer/:trainerId', WorkoutController.getWeeklyPlansByTrainer);

// Buscar planos semanais de um aluno
workoutRouter.get('/student/:studentId', WorkoutController.getWeeklyPlansByStudent);

// Atribuir plano a um aluno (copia plano existente)
workoutRouter.post('/assign-student', WorkoutController.assignWeeklyPlanToStudent);

// Atribuir plano a um aluno (copia plano existente)
workoutRouter.post('/assign-appointment', WorkoutController.assignSessionToAppointment);

// Atualizar sessão
workoutRouter.put('/session/:id', WorkoutController.updateSession);

// Excluir sessão
workoutRouter.delete('/session/:id', WorkoutController.deleteSession);

export { workoutRouter };

