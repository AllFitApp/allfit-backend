import { upload } from '@/lib/multer';
import { Router } from 'express';

import { ExerciseController } from '@/infra/controller/exerciseController';

const exerciseRouter = Router();

exerciseRouter.post('/', upload.single('exercise-image'), ExerciseController.createExercise);

exerciseRouter.get('/trainer/:trainerId', ExerciseController.getExercisesByTrainer);

exerciseRouter.put('/:id', ExerciseController.updateExercise);

exerciseRouter.delete('/:id', ExerciseController.deleteExercise);

export { exerciseRouter };

