import { Router } from 'express';
import {
  approveProperty,
  rejectProperty,
  archiveProperty,
  getAdminDashboard,
  getUsers,
  toggleUserStatus,
} from '../controllers/adminController.js';
import { getAllReviews } from '../controllers/reviewController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roles.js';
import { validate } from '../middleware/validate.js';
import { rejectPropertySchema } from '../validators/property.js';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/dashboard', getAdminDashboard);
router.put('/properties/:id/approve', approveProperty);
router.put('/properties/:id/reject', validate(rejectPropertySchema), rejectProperty);
router.put('/properties/:id/archive', archiveProperty);
router.get('/users', getUsers);
router.put('/users/:id/toggle-status', toggleUserStatus);
router.get('/reviews', getAllReviews);

export default router;
