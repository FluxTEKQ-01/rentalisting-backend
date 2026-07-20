import { z } from 'zod';

const locationSchema = z.object({
  address: z.string().optional().default(''),
  city: z.string().min(1, 'City is required'),
  state: z.string().optional().default(''),
  zipCode: z.string().optional().default(''),
  coordinates: z.object({
    lat: z.number().optional().default(0),
    lng: z.number().optional().default(0),
  }),
});

export const createPropertySchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(5, 'Title must be at least 5 characters')
      .max(200, 'Title must not exceed 200 characters'),
    description: z
      .string()
      .min(20, 'Description must be at least 20 characters'),
    propertyType: z.enum([
      'office',
      'shop_retail',
      'warehouse',
      'house_apartment',
      'villa',
      'open_plot_land',
      'event_venue',
      'coworking',
      'commercial_building',
      'parking',
      'showroom',
      'industrial',
      'hotel_banquet',
      'shooting_location',
      'storage',
    ]),
    price: z.number().min(0, 'Price cannot be negative'),
    maxPrice: z.number().min(0).optional(),
    bedrooms: z.number().int().min(0).optional().default(0),
    bathrooms: z.number().int().min(0).optional().default(0),
    area: z.number().min(0, 'Area cannot be negative'),
    maxArea: z.number().min(0).optional(),
    amenities: z.array(z.string()).optional().default([]),
    videoUrl: z.string().optional().default(''),
    location: locationSchema,
  }),
});

export const updatePropertySchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(5)
      .max(200)
      .optional(),
    description: z.string().min(20).optional(),
    propertyType: z
      .enum(['office', 'shop_retail', 'warehouse', 'house_apartment', 'villa', 'open_plot_land', 'event_venue', 'coworking', 'commercial_building', 'parking', 'showroom', 'industrial', 'hotel_banquet', 'shooting_location', 'storage'])
      .optional(),
    price: z.number().min(0).optional(),
    maxPrice: z.number().min(0).optional(),
    bedrooms: z.number().int().min(0).optional(),
    bathrooms: z.number().int().min(0).optional(),
    area: z.number().min(0).optional(),
    maxArea: z.number().min(0).optional(),
    amenities: z.array(z.string()).optional(),
    images: z
      .array(
        z.object({
          url: z.string(),
          publicId: z.string(),
        })
      )
      .optional(),
    videoUrl: z.string().optional(),
    location: locationSchema.optional(),
  }),
});

export const propertyQuerySchema = z.object({
  query: z.object({
    keyword: z.string().optional(),
    location: z.string().optional(),
    propertyType: z
      .enum(['office', 'shop_retail', 'warehouse', 'house_apartment', 'villa', 'open_plot_land', 'event_venue', 'coworking', 'commercial_building', 'parking', 'showroom', 'industrial', 'hotel_banquet', 'shooting_location', 'storage'])
      .optional(),
    minPrice: z.string().optional(),
    maxPrice: z.string().optional(),
    bedrooms: z.string().optional(),
    bathrooms: z.string().optional(),
    amenities: z.string().optional(),
    minArea: z.string().optional(),
    maxArea: z.string().optional(),
    status: z.string().optional(),
    sort: z
      .enum(['latest', 'oldest', 'price_low', 'price_high'])
      .optional()
      .default('latest'),
    page: z.string().optional().default('1'),
    limit: z.string().optional().default('12'),
  }),
});

export const rejectPropertySchema = z.object({
  body: z.object({
    feedback: z
      .string()
      .min(10, 'Feedback must be at least 10 characters')
      .max(1000, 'Feedback must not exceed 1000 characters'),
  }),
});
