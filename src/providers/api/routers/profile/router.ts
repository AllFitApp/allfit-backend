import { Router } from 'express';
import ProfileController from '../../../../infra/controller/ProfileController';

const router = Router();

router.get('/:id', ProfileController.getUserById);
router.post('/:id', ProfileController.createProfile);
router.put('/:id', ProfileController.updateProfile);
export default router;
