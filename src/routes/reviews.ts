import { Router } from 'express';
import {
  createReview,
  getPropertyReviews,
  deleteReview,
} from '../controllers/reviewController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createReviewSchema } from '../validators/review.js';

const router = Router();

router.get('/property/:propertyId', getPropertyReviews);
router.post(
  '/property/:propertyId',
  authenticate,
  validate(createReviewSchema),
  createReview
);
router.delete('/:id', authenticate, deleteReview);

export default router;
