import { Router } from 'express';
import { register, login, refreshToken, getProfile } from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema, refreshTokenSchema } from '../validators/auth.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', validate(refreshTokenSchema), refreshToken);
router.get('/profile', authenticate, getProfile);

export default router;
