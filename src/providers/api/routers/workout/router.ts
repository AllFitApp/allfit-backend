import { WorkoutController } from '@/infra/controller/workoutController';
import { Router } from 'express';

const workoutRouter = Router();

// Criar sessão de treino
workoutRouter.post('/create-session', WorkoutController.createWorkoutSession);
workoutRouter.get('/:id', WorkoutController.getWorkoutSession); // Buscar sessão por ID ou AppointmentId
workoutRouter.get('/:trainerId/trainer', WorkoutController.getWorkoutSessionsByTrainer);
workoutRouter.put('/session/:id', WorkoutController.updateSession); // Atualizar sessão
workoutRouter.delete('/session/:id', WorkoutController.deleteSession); // Excluir sessão

// workoutRouter.get('/weekly-plan/', WorkoutController.getWorkoutSessionsByWeeklyPlan);
workoutRouter.post('/weekly-plan', WorkoutController.createWeeklyPlan); // Criar plano semanal
workoutRouter.get('/weekly-plan/:id', WorkoutController.getWorkoutSessionsByWeeklyPlan);
workoutRouter.delete('/weekly-plan/:id', WorkoutController.deleteWeeklyPlan); // Buscar planos semanais de um aluno
workoutRouter.get('/trainer/:trainerId', WorkoutController.getWeeklyPlansByTrainer); // Buscar planos semanais de um treinador
workoutRouter.get('/student/:studentId', WorkoutController.getWeeklyPlansByStudent); // Buscar planos semanais de um aluno

// Atribuir plano a um aluno (copia plano existente)
workoutRouter.post('/assign-student', WorkoutController.assignWeeklyPlanToStudent);
// Atribuir plano a um aluno (copia plano existente)
workoutRouter.post('/assign-appointment', WorkoutController.assignSessionToAppointment);

export { workoutRouter };
