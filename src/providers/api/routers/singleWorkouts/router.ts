
// routes/pagarme.ts
import { Router } from 'express';

import PaymentController from '@/infra/controller/SingleWorkoutController';
import { upload } from '@/lib/multer';

const router = Router();

// ===== AULAS AVULSAS - ROTAS ATUALIZADAS =====
// Criar nova aula avulsa (antes era createSingleWorkoutModel)
router.post('/', upload.single('subscriptions-images'), PaymentController.createSingleWorkout); // Cria nova aula avulsa ✅
router.get('/trainer/:username', PaymentController.getSingleWorkoutsByTrainer); // Lista aulas avulsas do treinador com filtros ✅
router.get('/trainer/:username/categories', PaymentController.getSingleWorkoutCategories); // Lista categorias disponíveis ✅

router.get('/:workoutId', PaymentController.getSingleWorkout); // Busca aula avulsa específica por ID ✅
router.put('/:workoutId', PaymentController.updateSingleWorkout); // Atualiza aula avulsa específica ✅
router.delete('/:workoutId', PaymentController.deleteSingleWorkout); // Deleta/desativa aula avulsa específica ✅

export default router;