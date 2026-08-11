import { Request, Response } from 'express';
import { userRepository } from '../repositories/userRepository.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { isDatabaseConnected } from '../config/db.js';
import type { UserRole } from '../types/index.js';

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, mobile, password, role } = req.body;

    if (!isDatabaseConnected) {
      const mockId = `mock_u_${Date.now()}`;
      const payload = { userId: mockId, role: (role || 'owner') as UserRole };
      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);
      sendSuccess(
        res,
        {
          user: {
            id: mockId,
            name,
            email,
            mobile,
            role: role || 'owner',
          },
          accessToken,
          refreshToken,
        },
        'Registration successful (Memory Fallback)',
        201
      );
      return;
    }

    const conflict = await userRepository.findConflict(email, mobile);
    if (conflict) {
      sendError(
        res,
        conflict.field === 'email'
          ? 'An account with this email already exists'
          : 'An account with this mobile number already exists',
        409
      );
      return;
    }

    const hashedPassword = await hashPassword(password);
    const user = await userRepository.create({
      name,
      email,
      mobile,
      password: hashedPassword,
      role: role || 'owner',
    });

    const payload = { userId: user.id, role: user.role as UserRole };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    sendSuccess(
      res,
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          role: user.role,
        },
        accessToken,
        refreshToken,
      },
      'Registration successful',
      201
    );
  } catch (error: any) {
    console.error('Registration error:', error);

    // 23505 = unique_violation. Racing signups can slip past the pre-check above,
    // so translate it into the same 409 instead of leaking a raw Postgres message.
    if (error?.code === '23505') {
      const field = String(error?.message || '').includes('mobile') ? 'mobile number' : 'email';
      sendError(res, `An account with this ${field} already exists`, 409);
      return;
    }

    sendError(res, error?.message || 'Registration failed', 500);
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!isDatabaseConnected) {
      let role: UserRole = 'owner';
      let name = 'Owner User';
      if (email.startsWith('admin')) {
        role = 'admin';
        name = 'Admin User';
      } else if (email.startsWith('visitor') || email.startsWith('tenant')) {
        role = 'visitor';
        name = 'Visitor User';
      }
      
      const mockId = `mock_u_${role}`;
      const payload = { userId: mockId, role };
      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);

      sendSuccess(res, {
        user: {
          id: mockId,
          name,
          email,
          mobile: '5555555555',
          role,
        },
        accessToken,
        refreshToken,
      }, 'Login successful (Memory Fallback)');
      return;
    }

    const user = await userRepository.findOne({ email });
    if (!user) {
      sendError(res, 'Invalid email or password', 401);
      return;
    }

    if (!user.is_active) {
      sendError(res, 'Account has been deactivated', 403);
      return;
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      sendError(res, 'Invalid email or password', 401);
      return;
    }

    const payload = { userId: user.id, role: user.role as UserRole };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    sendSuccess(res, {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    sendError(res, 'Login failed', 500);
  }
}

export async function refreshToken(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { refreshToken: token } = req.body;

    if (!isDatabaseConnected) {
      const decoded = verifyRefreshToken(token);
      const payload = { userId: decoded.userId, role: (decoded.role || 'owner') as UserRole };
      const accessToken = generateAccessToken(payload);
      const newRefreshToken = generateRefreshToken(payload);
      sendSuccess(res, {
        accessToken,
        refreshToken: newRefreshToken,
      });
      return;
    }

    const decoded = verifyRefreshToken(token);
    const user = await userRepository.findById(decoded.userId);

    if (!user || !user.is_active) {
      sendError(res, 'Invalid refresh token', 401);
      return;
    }

    const payload = { userId: user.id, role: user.role as UserRole };
    const accessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    sendSuccess(res, {
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    sendError(res, 'Invalid or expired refresh token', 401);
  }
}

export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user.userId;

    if (!isDatabaseConnected) {
      const role = (req as any).user.role || 'owner';
      let name = 'Owner User';
      let email = 'owner@rentalisting.com';
      if (role === 'admin') {
        name = 'Admin User';
        email = 'admin@rentalisting.com';
      } else if (role === 'visitor') {
        name = 'Visitor User';
        email = 'visitor@rentalisting.com';
      }
      sendSuccess(res, {
        user: {
          _id: userId,
          name,
          email,
          role,
        }
      });
      return;
    }

    const user = await userRepository.findByIdSafe(userId);

    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    sendSuccess(res, { user });
  } catch (error) {
    sendError(res, 'Failed to fetch profile', 500);
  }
}
