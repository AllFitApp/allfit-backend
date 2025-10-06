import PartnerGymController from '@/infra/controller/partnerGymController';
import { upload } from '@/lib/multer';
import { Router } from 'express';

const partnerGymRouter = Router();

// === ROTAS PÚBLICAS ===

// Listar academias ativas com filtros
partnerGymRouter.get('/', PartnerGymController.getAll);

// Buscar academia por ID
partnerGymRouter.get('/:id', PartnerGymController.getById);

// Buscar academias próximas por localização
partnerGymRouter.get('/search/nearby', PartnerGymController.getNearby);

// Buscar academias por serviços específicos
partnerGymRouter.get('/search/services', PartnerGymController.getByServices);

// === ROTAS PROTEGIDAS (ADMIN) ===

// Criar nova academia parceira
partnerGymRouter.post('/create', upload.single('file'), PartnerGymController.create);

// Atualizar academia parceira
partnerGymRouter.put('/:id', PartnerGymController.update);

// Desativar academia parceira (soft delete)
partnerGymRouter.patch('/:id/deactivate', PartnerGymController.deactivate);

// Reativar academia parceira
partnerGymRouter.patch('/:id/activate', PartnerGymController.activate);

// Deletar permanentemente (apenas admin)
partnerGymRouter.delete('/:id', PartnerGymController.delete);

export { partnerGymRouter };
