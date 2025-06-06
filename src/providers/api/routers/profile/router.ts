import { Router } from 'express';
import ProfileController from '../../../../infra/controller/ProfileController';

const router = Router();

router.get('/:username', ProfileController.getUserByUsername);
router.post('/:id', ProfileController.createProfile);
router.put('/:id', ProfileController.updateProfile);
export default router;
