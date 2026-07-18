import { z } from 'zod';

export const createReviewSchema = z.object({
  body: z.object({
    rating: z
      .number()
      .int()
      .min(1, 'Rating must be at least 1')
      .max(5, 'Rating must not exceed 5'),
    comment: z
      .string()
      .min(10, 'Comment must be at least 10 characters')
      .max(500, 'Comment must not exceed 500 characters'),
  }),
});
