import { Router } from 'express';

import * as MeController from '../controllers/me.controller.js';

import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';

import { addressSchema, patchMeSchema } from '../validators/schemas.js';

export function buildMeRoutes(): Router {
  const router = Router();

  router.get('/me', authenticate, MeController.getMe);
  router.patch('/me', authenticate, validate('body', patchMeSchema), MeController.patchMe);
  router.post('/me/addresses', authenticate, validate('body', addressSchema), MeController.addAddress);
  router.patch('/me/addresses/:id', authenticate, MeController.updateAddress);
  router.post('/me/push-token', authenticate, MeController.savePushToken);
  router.post('/users/push-token', authenticate, MeController.savePushToken);

  return router;
}
