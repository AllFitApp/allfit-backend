import { webhookHandler } from '@/infra/webhook/handler';
import { Router } from 'express';

const router = Router();

router.post('/pagarme', webhookHandler);
