import AppointmentController from '@/infra/controller/AppointmentController';
import { Router } from 'express';

const router = Router();

// CRUD de agendamento
router.post('/', AppointmentController.create);
router.get('/', AppointmentController.getAll);
router.get('/:id', AppointmentController.getById);
router.get('/by-month/:year/:month/:id', AppointmentController.getByMonth);
router.put('/:id', AppointmentController.update);
router.delete('/:id', AppointmentController.delete);

// Rotas para controle de status pelo treinador
router.patch('/:id/accept', AppointmentController.acceptAppointment);
router.patch('/:id/reject', AppointmentController.rejectAppointment);

// Rotas para controle de status da aula
router.patch('/:id/complete', AppointmentController.markAsCompleted);
router.patch('/:id/mark-paid', AppointmentController.markAsPaid);

// Rotas de horários do treinador
router.post('/horarios', AppointmentController.addTrainerSchedule);
router.get('/horarios/:trainerUsername', AppointmentController.getTrainerSchedule);
router.get('/horarios/date/:trainerId/:date', AppointmentController.getAvailableTimes);

export default router;