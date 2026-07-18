import { Router } from 'express';
import {
  createProperty,
  getProperties,
  getPropertyById,
  updateProperty,
  submitProperty,
  resubmitProperty,
  deleteProperty,
  getOwnerProperties,
} from '../controllers/propertyController.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roles.js';
import { validate } from '../middleware/validate.js';
import {
  createPropertySchema,
  updatePropertySchema,
  propertyQuerySchema,
} from '../validators/property.js';

const router = Router();

router.get('/', validate(propertyQuerySchema), getProperties);
router.get('/my-listings', authenticate, authorize('owner'), getOwnerProperties);
router.get('/:id', optionalAuthenticate, getPropertyById);
router.post('/', authenticate, authorize('owner'), validate(createPropertySchema), createProperty);
router.put('/:id', authenticate, authorize('owner'), validate(updatePropertySchema), updateProperty);
router.post('/:id/submit', authenticate, authorize('owner'), submitProperty);
router.post('/:id/resubmit', authenticate, authorize('owner'), resubmitProperty);
router.delete('/:id', authenticate, deleteProperty);

export default router;
