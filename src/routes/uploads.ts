import { Router } from 'express';
import { uploadImages, deleteImage, upload } from '../controllers/uploadController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roles.js';

const router = Router();

router.post('/images', authenticate, authorize('owner', 'admin'), upload.array('images', 10), uploadImages);
router.delete('/image', authenticate, authorize('owner', 'admin'), deleteImage);

export default router;
