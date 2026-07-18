import { Router } from 'express';
import { getAnalytics } from '../controllers/analyticsController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roles.js';

const router = Router();

router.get('/', authenticate, authorize('admin'), getAnalytics);

export default router;
