import { Router } from 'express';
import {
  createReview,
  getPropertyReviews,
  updateReview,
  deleteReview,
} from '../controllers/reviewController.js';
import { optionalAuthenticate } from '../middleware/auth.js';

const router = Router();

router.get('/property/:propertyId', getPropertyReviews);
router.post('/property/:propertyId', optionalAuthenticate, createReview);
router.put('/:id', optionalAuthenticate, updateReview);
router.delete('/:id', optionalAuthenticate, deleteReview);

export default router;
