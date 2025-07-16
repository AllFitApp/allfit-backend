// routes/pagarme.ts
import { Router } from 'express';

import RecipientController from '../../../../infra/controller/RecipientController';

const walletRouter = Router();
const recipientController = new RecipientController();

// Recipient
walletRouter.post('/', recipientController.createTrainerWallet); // Criar carteira de personal
walletRouter.get('/:userId', recipientController.getTrainerBalance); // Verifica e sincroniza saldo
walletRouter.post('/:userId/withdraw', recipientController.requestWithdrawal); // Saque de valores da carteira
walletRouter.patch('/:userId', recipientController.editBankAccount); // Confirma saque

export default walletRouter;
