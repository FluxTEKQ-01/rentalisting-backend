  import express from 'express';
  import cors from 'cors';
  import helmet from 'helmet';
  import rateLimit from 'express-rate-limit';
  import { env } from './config/env.js';
  import { connectDB } from './config/db.js';
  import { errorHandler, notFound } from './middleware/errorHandler.js';

  import authRoutes from './routes/auth.js';
  import propertyRoutes from './routes/properties.js';
  import adminRoutes from './routes/admin.js';
  import reviewRoutes from './routes/reviews.js';
  import notificationRoutes from './routes/notifications.js';
  import uploadRoutes from './routes/uploads.js';
  import analyticsRoutes from './routes/analytics.js';
  import commentRoutes from './routes/commentRoutes.js';

  const app = express();

  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
    })
  );
  app.use(helmet());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, message: 'Too many requests, please try again later' },
  });
  app.use('/api/auth', limiter);

  app.get('/api/health', (_req, res) => {
    res.json({ success: true, message: 'API is running' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/properties', propertyRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/uploads', uploadRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/comments', commentRoutes);

  app.use(notFound);
  app.use(errorHandler);

  async function start() {
    await connectDB();
    app.listen(env.port, () => {
      console.log(`Server running on port ${env.port}`);
    });
  }

  start();
