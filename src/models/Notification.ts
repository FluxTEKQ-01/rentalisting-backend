import mongoose, { Schema, Document } from 'mongoose';

export type NotificationType =
  | 'listing_submitted'
  | 'listing_approved'
  | 'listing_rejected'
  | 'listing_resubmitted'
  | 'feedback_available'
  | 'listing_published'
  | 'new_submission'
  | 'new_review'
  | 'inquiry';

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  isRead: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient is required'],
    },
    type: {
      type: String,
      required: true,
      enum: [
        'listing_submitted',
        'listing_approved',
        'listing_rejected',
        'listing_resubmitted',
        'feedback_available',
        'listing_published',
        'new_submission',
        'new_review',
        'inquiry',
      ],
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

export const Notification = mongoose.model<INotification>(
  'Notification',
  notificationSchema
);
