import { ExerciseController } from '@/infra/controller/exerciseController';
import { Router } from 'express';

const exerciseRouter = Router();

exerciseRouter.post('/', ExerciseController.createExercise);

exerciseRouter.get('/trainer/:trainerId', ExerciseController.getExercisesByTrainer);

exerciseRouter.put('/:id', ExerciseController.updateExercise);

exerciseRouter.delete('/:id', ExerciseController.deleteExercise);

export { exerciseRouter };

