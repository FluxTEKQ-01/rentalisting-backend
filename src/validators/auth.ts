import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must not exceed 100 characters'),
    email: z.string().email('Invalid email format'),
    mobile: z
      .string()
      .min(10, 'Mobile number must be at least 10 digits')
      .max(15, 'Mobile number must not exceed 15 digits'),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .max(128, 'Password must not exceed 128 characters'),
    role: z.enum(['visitor', 'owner', 'admin']).optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});
