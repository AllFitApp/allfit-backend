// routes/pagarme.ts
import { Router } from 'express';

import CustomerController from '@/infra/controller/CustomerController';

const customerRouter = Router();

// Customer
customerRouter.post('/', async (req, res) => {
	const { userId } = req.body;

	const response = await CustomerController.createCustomer(userId);
	res.status(response.status).json(response.data);
});
customerRouter.get('/', CustomerController.listCustomers);
customerRouter.get('/:userId', CustomerController.getCustomer);
customerRouter.put('/:userId', CustomerController.updateCustomer);

customerRouter.post('/:userId/cards', CustomerController.saveCard); // Adiciona um cartão para um usuário
customerRouter.get('/:userId/cards', CustomerController.getSavedCards); // Lista cartões do usuário
customerRouter.get('/:userId/cards/sync', CustomerController.syncSavedCards); // Lista cartões do usuário

export default customerRouter;
