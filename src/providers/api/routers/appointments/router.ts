import AppointmentController from '@/infra/controller/AppointmentController';
import { Router } from 'express';

const router = Router();

router.post('/', AppointmentController.create);

router.get('/', AppointmentController.getAll);
router.get('/:id', AppointmentController.getById);
router.get('/by-month/:year/:month/:trainerId', AppointmentController.getByMonth);

router.put('/:id', AppointmentController.update);
router.delete('/:id', AppointmentController.delete);

export default router;
