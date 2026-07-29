import { Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { env } from '../config/env.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import type { AuthRequest } from '../types/index.js';

cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret,
});

const storage = multer.memoryStorage();

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 4,
  },
});

export async function uploadImages(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.files || !(req.files as Express.Multer.File[]).length) {
      sendError(res, 'No files uploaded', 400);
      return;
    }

    const files = req.files as Express.Multer.File[];
    const isCloudinaryConfigured = Boolean(
      env.cloudinary.cloudName &&
      env.cloudinary.cloudName !== 'mock_cloud' &&
      env.cloudinary.apiKey &&
      env.cloudinary.apiSecret
    );

    if (isCloudinaryConfigured) {
      try {
        const uploadPromises = files.map((file) => {
          return new Promise<{ url: string; publicId: string }>(
            (resolve, reject) => {
              const uploadStream = cloudinary.uploader.upload_stream(
                {
                  folder: 'rentalisting',
                  resource_type: 'image',
                  transformation: [
                    { quality: 'auto', fetch_format: 'webp' },
                    { width: 1200, height: 800, crop: 'limit' },
                  ],
                },
                (error, result) => {
                  if (error) reject(error);
                  else
                    resolve({
                      url: result!.secure_url,
                      publicId: result!.public_id,
                    });
                }
              );
              uploadStream.end(file.buffer);
            }
          );
        });

        const results = await Promise.all(uploadPromises);
        sendSuccess(res, { images: results }, 'Images uploaded to Cloudinary', 201);
        return;
      } catch (cloudError) {
        console.warn('[Upload] Cloudinary upload error, using direct image buffer encoding fallback:', cloudError);
      }
    }

    // Convert exact uploaded file buffers into Base64 Data URIs so the user's actual submitted images are saved & displayed
    const results = files.map((file, index) => {
      const mime = file.mimetype || 'image/jpeg';
      const base64 = file.buffer.toString('base64');
      const dataUrl = `data:${mime};base64,${base64}`;
      return {
        url: dataUrl,
        publicId: `local_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 7)}`,
      };
    });

    sendSuccess(res, { images: results }, 'Images uploaded successfully', 201);
  } catch (error) {
    console.error('Error in uploadImages:', error);
    sendError(res, 'Failed to upload images', 500);
  }
}

export async function deleteImage(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      sendError(res, 'Public ID is required', 400);
      return;
    }

    await cloudinary.uploader.destroy(publicId);
    sendSuccess(res, null, 'Image deleted');
  } catch (error) {
    sendError(res, 'Failed to delete image', 500);
  }
}
