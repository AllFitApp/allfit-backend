import { upload } from '@/lib/multer';
import { Router } from 'express';

import ProfileController from '../../../../infra/controller/ProfileController';

const router = Router();

router.get('/:username', ProfileController.getUserByUsername);
router.post('/:id', ProfileController.createProfile);
router.put('/:id', ProfileController.updateProfile);
router.patch('/:id/avatar', upload.single('avatar'), ProfileController.updateAvatar);
router.patch('/:id/market-image', upload.single('market-image'), ProfileController.updateMartketImage);
router.get('/list/trainers', ProfileController.listTrainers);
router.get('/list/users', ProfileController.listUsers);

export default router;
