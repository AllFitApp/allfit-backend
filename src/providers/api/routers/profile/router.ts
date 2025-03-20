import { Router } from 'express';
import ProfileController from '../../../../infra/controller/ProfileController';

const router = Router();

router.get('/:id', ProfileController.getUserById);
router.put('/:id', ProfileController.createProfile); 
export default router;