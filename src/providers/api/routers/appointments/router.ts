import AppointmentController from '@/infra/controller/AppointmentController';
import { Router } from 'express';

const router = Router();

router.post('/', AppointmentController.create);

router.get('/', AppointmentController.getAll);
router.get('/:id', AppointmentController.getById);
router.get('/by-month/:year/:month/:id', AppointmentController.getByMonth);

router.put('/:id', AppointmentController.update);
router.delete('/:id', AppointmentController.delete);

router.post('/horarios', AppointmentController.addTrainerSchedule);
router.get('/horarios/:id', AppointmentController.getTrainerSchedule);

export default router;
