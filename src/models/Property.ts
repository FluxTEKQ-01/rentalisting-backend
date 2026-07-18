import mongoose, { Schema, Document } from 'mongoose';
import type { PropertyStatus, PropertyCategory } from '../types/index.js';

export interface IProperty extends Document {
  title: string;
  description: string;
  propertyType: PropertyCategory;
  price: number;
  maxPrice?: number;
  currency: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  maxArea?: number;
  areaUnit: string;
  amenities: string[];
  images: { url: string; publicId: string }[];
  videoUrl: string;
  location: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  owner: mongoose.Types.ObjectId;
  status: PropertyStatus;
  feedback: string;
  feedbackProvidedAt: Date;
  reviewedBy: mongoose.Types.ObjectId;
  reviewedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const propertySchema = new Schema<IProperty>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters'],
      maxlength: [200, 'Title must not exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [20, 'Description must be at least 20 characters'],
    },
    propertyType: {
      type: String,
      required: [true, 'Property type is required'],
      enum: ['apartment', 'house', 'villa', 'commercial', 'office', 'land', 'pg_hostel'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    maxPrice: {
      type: Number,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    bedrooms: {
      type: Number,
      default: 0,
      min: 0,
    },
    bathrooms: {
      type: Number,
      default: 0,
      min: 0,
    },
    area: {
      type: Number,
      required: [true, 'Area is required'],
      min: [0, 'Area cannot be negative'],
    },
    maxArea: {
      type: Number,
      min: 0,
    },
    areaUnit: {
      type: String,
      default: 'sqft',
    },
    amenities: [
      {
        type: String,
        trim: true,
      },
    ],
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
      },
    ],
    videoUrl: {
      type: String,
      default: '',
    },
    location: {
      address: { type: String, default: '' },
      city: { type: String, required: [true, 'City is required'] },
      state: { type: String, default: '' },
      zipCode: { type: String, default: '' },
      coordinates: {
        lat: { type: Number, default: 0 },
        lng: { type: Number, default: 0 },
      },
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner is required'],
    },
    status: {
      type: String,
      enum: [
        'draft',
        'submitted',
        'pending_review',
        'approved',
        'rejected',
        'published',
        'archived',
      ],
      default: 'draft',
    },
    feedback: {
      type: String,
      default: '',
    },
    feedbackProvidedAt: {
      type: Date,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

propertySchema.index({ status: 1 });
propertySchema.index({ owner: 1 });
propertySchema.index({ 'location.city': 1 });
propertySchema.index({ propertyType: 1 });
propertySchema.index({ price: 1 });
propertySchema.index({ title: 'text', description: 'text' });

export const Property = mongoose.model<IProperty>('Property', propertySchema);
