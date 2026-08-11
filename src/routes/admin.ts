import { Router } from 'express';
import {
  approveProperty,
  rejectProperty,
  archiveProperty,
  getAdminDashboard,
  getUsers,
  toggleUserStatus,
  deleteUser,
} from '../controllers/adminController.js';
import { getAllReviews } from '../controllers/reviewController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roles.js';
import { validate } from '../middleware/validate.js';
import { rejectPropertySchema } from '../validators/property.js';
import verifyRoutes from './admin-verify.js';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/dashboard', getAdminDashboard);
router.put('/properties/:id/approve', approveProperty);
router.put('/properties/:id/reject', validate(rejectPropertySchema), rejectProperty);
router.put('/properties/:id/archive', archiveProperty);
router.get('/users', getUsers);
router.put('/users/:id/toggle-status', toggleUserStatus);
router.delete('/users/:id', deleteUser);
router.get('/reviews', getAllReviews);

// Temporary verification endpoint (DELETE THIS AND admin-verify.ts after use)
router.use('/verify', verifyRoutes);

export default router;
