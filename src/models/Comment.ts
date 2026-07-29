import mongoose, { Schema, Document } from 'mongoose';

export interface IComment extends Document {
  propertyId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  address: string;
  comment: string;
  createdAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'Property ID is required'],
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
    comment: {
      type: String,
      required: [true, 'Comment is required'],
      trim: true,
    },
  },
  { timestamps: true }
);

commentSchema.index({ propertyId: 1, createdAt: -1 });

export const Comment = mongoose.model<IComment>('Comment', commentSchema);
