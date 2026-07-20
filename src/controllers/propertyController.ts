import { Response } from 'express';
import { Property } from '../models/Property.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { sendSuccess, sendError, sendPaginated } from '../utils/apiResponse.js';
import type { AuthRequest, PropertyQuery } from '../types/index.js';
import { isDatabaseConnected } from '../config/db.js';

export let inMemoryProperties: any[] = [];
let hasInitMemoryStore = false;

export function initInMemoryStore() {
  if (hasInitMemoryStore) return;
  hasInitMemoryStore = true;
  inMemoryProperties = [
    {
      _id: 'mock_indiranagar_apt_1',
      title: 'Premium 3 BHK Apartment in Indiranagar',
      description: 'Luxurious 3 bedroom apartment situated in the heart of Indiranagar. Fully furnished with modern amenities, modular kitchen, and private balcony. Located near major restaurants, shops, and metro station.',
      propertyType: 'house_apartment',
      price: 45000,
      currency: 'INR',
      bedrooms: 3,
      bathrooms: 3,
      area: 1800,
      areaUnit: 'sqft',
      amenities: ['Power Backup', 'Lift', 'Gym', 'Car Parking', '24/7 Security', 'Swimming Pool'],
      images: [
        { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&h=800&q=80', publicId: 'mock_p1_1' }
      ],
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      location: {
        address: '12th Main Road, Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        zipCode: '560038',
        coordinates: { lat: 12.9716, lng: 77.5946 },
      },
      owner: 'mock_owner_user_id',
      status: 'published',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: 'mock_whitefield_villa_1',
      title: 'Elegant Villa in Whitefield Sanctuary',
      description: 'Spacious independent 4 BHK villa located inside a gated community in Whitefield. Private garden, servant room, modular kitchen, and Italian marble flooring. Ideal for corporate families.',
      propertyType: 'villa',
      price: 85000,
      currency: 'INR',
      bedrooms: 4,
      bathrooms: 4,
      area: 3200,
      areaUnit: 'sqft',
      amenities: ['Private Garden', 'Gated Community', 'Club House', 'Gym', 'Jogging Track', 'Tennis Court'],
      images: [
        { url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&h=800&q=80', publicId: 'mock_p2_1' }
      ],
      videoUrl: '',
      location: {
        address: 'Whitefield',
        city: 'Bengaluru',
        state: 'Karnataka',
        zipCode: '560066',
        coordinates: { lat: 12.9698, lng: 77.7500 },
      },
      owner: 'mock_owner_user_id',
      status: 'published',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  ];
}

export function getFallbackImagesForPropertyType(propertyType: string): { url: string; publicId: string }[] {
  const imagesMap: Record<string, string[]> = {
    office: [
      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&h=800&q=80',
    ],
    shop_retail: [
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&h=800&q=80',
    ],
    warehouse: [
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&h=800&q=80',
    ],
    house_apartment: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&h=800&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&h=800&q=80',
    ],
    villa: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&h=800&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&h=800&q=80',
    ],
    open_plot_land: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&h=800&q=80',
    ],
    event_venue: [
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&h=800&q=80',
    ],
    coworking: [
      'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1200&h=800&q=80',
    ],
    commercial_building: [
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&h=800&q=80',
    ],
    parking: [
      'https://images.unsplash.com/photo-1573342212426-182bae5e9d0d?auto=format&fit=crop&w=1200&h=800&q=80',
    ],
    showroom: [
      'https://images.unsplash.com/photo-1555633514-ab2cdb4d6c91?auto=format&fit=crop&w=1200&h=800&q=80',
    ],
    industrial: [
      'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=1200&h=800&q=80',
    ],
    hotel_banquet: [
      'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1200&h=800&q=80',
    ],
    shooting_location: [
      'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&h=800&q=80',
    ],
    storage: [
      'https://images.unsplash.com/photo-1594026112284-02bb6f3352fe?auto=format&fit=crop&w=1200&h=800&q=80',
    ],
  };

  const urls = imagesMap[propertyType] || imagesMap.apartment;
  return urls.map((url, index) => ({
    url,
    publicId: `auto_configured_${propertyType}_${index}`
  }));
}

export async function createProperty(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    let { title, description, propertyType, price, maxPrice, bedrooms, bathrooms, area, maxArea, amenities, videoUrl, location, images } = req.body;
    
    // Auto-configure photos if listing manager leaves it blank
    if (!images || images.length === 0) {
      images = getFallbackImagesForPropertyType(propertyType);
    }

    if (!isDatabaseConnected) {
      initInMemoryStore();
      const property = {
        _id: `mock_p_${Date.now()}`,
        title, description, propertyType, price, maxPrice, bedrooms, bathrooms, area, maxArea,
        amenities, videoUrl, location, images,
        owner: req.user?.userId || 'mock_owner_user_id',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryProperties.unshift(property);
      sendSuccess(res, { property }, 'Property created in memory fallback', 201);
      return;
    }

    const property = await Property.create({
      title, description, propertyType, price, maxPrice, bedrooms, bathrooms, area, maxArea,
      amenities, videoUrl, location, images,
      owner: req.user!.userId,
    });
    sendSuccess(res, { property }, 'Property created', 201);
  } catch (error) {
    sendError(res, 'Failed to create property', 500);
  }
}

export async function getProperties(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const query = req.query as unknown as PropertyQuery;
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '12', 10);
    const skip = (page - 1) * limit;

    if (!isDatabaseConnected) {
      initInMemoryStore();
      let list = [...inMemoryProperties];
      
      if (query.propertyType) {
        list = list.filter(p => p.propertyType === query.propertyType);
      }
      if (query.status) {
        const statuses = query.status.split(',');
        list = list.filter(p => statuses.includes(p.status));
      } else if (req.user?.role !== 'admin') {
        if (req.user?.role === 'owner') {
          list = list.filter(p => p.status === 'published' || p.owner === req.user?.userId || p.owner?._id === req.user?.userId);
        } else {
          list = list.filter(p => p.status === 'published');
        }
      }
      if (query.keyword) {
        const kw = query.keyword.toLowerCase();
        list = list.filter(p => 
          p.title.toLowerCase().includes(kw) || 
          p.description.toLowerCase().includes(kw) || 
          p.location?.city?.toLowerCase().includes(kw)
        );
      }

      sendPaginated(res, list.slice(skip, skip + limit), list.length, page, limit);
      return;
    }

    const filter: Record<string, unknown> = {};

    if (req.user?.role !== 'admin') {
      if (req.user?.role === 'owner') {
        filter.$or = [
          { owner: req.user.userId },
          { status: 'published' },
        ];
      } else {
        filter.status = 'published';
      }
    }

    if (query.status) {
      filter.status = query.status.includes(',') ? { $in: query.status.split(',') } : query.status;
    }
    if (query.owner) filter.owner = query.owner;
    if (query.propertyType) filter.propertyType = query.propertyType;

    if (query.keyword) {
      filter.$text = { $search: query.keyword };
    }

    if (query.location) {
      filter['location.city'] = { $regex: query.location, $options: 'i' };
    }

    if (query.minPrice || query.maxPrice) {
      const priceFilter: Record<string, number> = {};
      if (query.minPrice) priceFilter.$gte = parseInt(query.minPrice, 10);
      if (query.maxPrice) priceFilter.$lte = parseInt(query.maxPrice, 10);
      filter.price = priceFilter;
    }

    if (query.bedrooms) filter.bedrooms = { $gte: parseInt(query.bedrooms, 10) };
    if (query.bathrooms) filter.bathrooms = { $gte: parseInt(query.bathrooms, 10) };

    if (query.minArea || query.maxArea) {
      const areaFilter: Record<string, number> = {};
      if (query.minArea) areaFilter.$gte = parseFloat(query.minArea);
      if (query.maxArea) areaFilter.$lte = parseFloat(query.maxArea);
      filter.area = areaFilter;
    }

    if (query.amenities) {
      const amenities = query.amenities.split(',');
      filter.amenities = { $all: amenities };
    }

    let sortOption: Record<string, 1 | -1> = { createdAt: -1 };
    switch (query.sort) {
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
      case 'price_low':
        sortOption = { price: 1 };
        break;
      case 'price_high':
        sortOption = { price: -1 };
        break;
    }

    const [properties, total] = await Promise.all([
      Property.find(filter)
        .populate('owner', 'name email mobile avatar')
        .sort(sortOption)
        .skip(skip)
        .limit(limit),
      Property.countDocuments(filter),
    ]);

    sendPaginated(res, properties, total, page, limit);
  } catch (error) {
    sendError(res, 'Failed to fetch properties', 500);
  }
}

export async function getPropertyById(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!isDatabaseConnected) {
      initInMemoryStore();
      const property = inMemoryProperties.find(p => p._id === req.params.id);
      if (!property) {
        sendError(res, 'Property not found', 404);
        return;
      }
      sendSuccess(res, { property });
      return;
    }

    const property = await Property.findById(req.params.id)
      .populate('owner', 'name email mobile avatar')
      .populate('reviewedBy', 'name');

    if (!property) {
      sendError(res, 'Property not found', 404);
      return;
    }

    if (
      property.status !== 'published' &&
      req.user?.role !== 'admin' &&
      (property.owner?._id?.toString() ?? property.owner?.toString()) !== req.user?.userId
    ) {
      sendError(res, 'Property not found', 404);
      return;
    }

    sendSuccess(res, { property });
  } catch (error) {
    sendError(res, 'Failed to fetch property', 500);
  }
}

export async function updateProperty(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    let { title, description, propertyType, price, maxPrice, bedrooms, bathrooms, area, maxArea, amenities, videoUrl, location, images } = req.body;
    
    // Auto-configure photos if empty
    if (images && images.length === 0) {
      images = getFallbackImagesForPropertyType(propertyType);
    }

    if (!isDatabaseConnected) {
      initInMemoryStore();
      const idx = inMemoryProperties.findIndex(p => p._id === req.params.id);
      if (idx === -1) {
        sendError(res, 'Property not found', 404);
        return;
      }
      const existing = inMemoryProperties[idx];
      const updated = {
        ...existing,
        title: title ?? existing.title,
        description: description ?? existing.description,
        propertyType: propertyType ?? existing.propertyType,
        price: price ?? existing.price,
        maxPrice: maxPrice ?? existing.maxPrice,
        bedrooms: bedrooms ?? existing.bedrooms,
        bathrooms: bathrooms ?? existing.bathrooms,
        area: area ?? existing.area,
        maxArea: maxArea ?? existing.maxArea,
        amenities: amenities ?? existing.amenities,
        videoUrl: videoUrl ?? existing.videoUrl,
        location: location ? { ...existing.location, ...location } : existing.location,
        images: images ?? existing.images,
        updatedAt: new Date(),
      };
      inMemoryProperties[idx] = updated;
      sendSuccess(res, { property: updated }, 'Property updated in memory fallback');
      return;
    }

    const property = await Property.findById(req.params.id);

    if (!property) {
      sendError(res, 'Property not found', 404);
      return;
    }

    if (
      (property.owner?._id?.toString() ?? property.owner?.toString()) !== req.user!.userId &&
      req.user!.role !== 'admin'
    ) {
      sendError(res, 'Not authorized to update this property', 403);
      return;
    }

    if (property.status === 'published' && req.user!.role !== 'admin') {
      sendError(res, 'Published properties cannot be edited', 403);
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (propertyType !== undefined) updateData.propertyType = propertyType;
    if (price !== undefined) updateData.price = price;
    if (maxPrice !== undefined) updateData.maxPrice = maxPrice;
    if (bedrooms !== undefined) updateData.bedrooms = bedrooms;
    if (bathrooms !== undefined) updateData.bathrooms = bathrooms;
    if (area !== undefined) updateData.area = area;
    if (maxArea !== undefined) updateData.maxArea = maxArea;
    if (amenities !== undefined) updateData.amenities = amenities;
    if (videoUrl !== undefined) updateData.videoUrl = videoUrl;
    if (location !== undefined) updateData.location = location;
    if (images !== undefined) updateData.images = images;

    const updatedProperty = await Property.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    sendSuccess(res, { property: updatedProperty }, 'Property updated');
  } catch (error) {
    sendError(res, 'Failed to update property', 500);
  }
}

export async function submitProperty(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!isDatabaseConnected) {
      initInMemoryStore();
      const property = inMemoryProperties.find(p => p._id === req.params.id);
      if (!property) {
        sendError(res, 'Property not found', 404);
        return;
      }
      property.status = 'submitted';
      sendSuccess(res, { property }, 'Property submitted in memory fallback');
      return;
    }

    const property = await Property.findById(req.params.id);

    if (!property) {
      sendError(res, 'Property not found', 404);
      return;
    }

    if ((property.owner?._id?.toString() ?? property.owner?.toString()) !== req.user!.userId) {
      sendError(res, 'Not authorized', 403);
      return;
    }

    if (property.status === 'published') {
      sendError(res, 'Property is already published', 400);
      return;
    }

    property.status = 'submitted';
    await property.save();

    const admins = await User.find({ role: 'admin' });
    const notifications = admins.map((admin) => ({
      recipient: admin._id,
      type: 'new_submission' as const,
      title: 'New Listing Submitted',
      message: `Property "${property.title}" has been submitted for review.`,
      metadata: { propertyId: property._id },
    }));
    await Notification.insertMany(notifications);

    sendSuccess(res, { property }, 'Property submitted for review');
  } catch (error) {
    sendError(res, 'Failed to submit property', 500);
  }
}

export async function resubmitProperty(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!isDatabaseConnected) {
      initInMemoryStore();
      const property = inMemoryProperties.find(p => p._id === req.params.id);
      if (!property) {
        sendError(res, 'Property not found', 404);
        return;
      }
      property.status = 'pending_review';
      sendSuccess(res, { property }, 'Property resubmitted in memory fallback');
      return;
    }

    const property = await Property.findById(req.params.id);

    if (!property) {
      sendError(res, 'Property not found', 404);
      return;
    }

    if ((property.owner?._id?.toString() ?? property.owner?.toString()) !== req.user!.userId) {
      sendError(res, 'Not authorized', 403);
      return;
    }

    if (property.status !== 'rejected') {
      sendError(res, 'Only rejected properties can be resubmitted', 400);
      return;
    }

    const { title, description, propertyType, price, maxPrice, bedrooms, bathrooms, area, maxArea, amenities, videoUrl, location } = req.body;

    if (title) property.title = title;
    if (description) property.description = description;
    if (propertyType) property.propertyType = propertyType;
    if (price !== undefined) property.price = price;
    if (maxPrice !== undefined) property.maxPrice = maxPrice;
    if (bedrooms !== undefined) property.bedrooms = bedrooms;
    if (bathrooms !== undefined) property.bathrooms = bathrooms;
    if (area !== undefined) property.area = area;
    if (maxArea !== undefined) property.maxArea = maxArea;
    if (amenities) property.amenities = amenities;
    if (videoUrl !== undefined) property.videoUrl = videoUrl;
    if (location) property.location = location;

    property.status = 'pending_review';
    property.feedback = '';
    await property.save();

    const admins = await User.find({ role: 'admin' });
    const notifications = admins.map((admin) => ({
      recipient: admin._id,
      type: 'listing_resubmitted' as const,
      title: 'Listing Resubmitted',
      message: `Property "${property.title}" has been resubmitted for review.`,
      metadata: { propertyId: property._id },
    }));
    await Notification.insertMany(notifications);

    sendSuccess(res, { property }, 'Property resubmitted for review');
  } catch (error) {
    sendError(res, 'Failed to resubmit property', 500);
  }
}

export async function deleteProperty(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!isDatabaseConnected) {
      initInMemoryStore();
      const idx = inMemoryProperties.findIndex(p => p._id === req.params.id);
      if (idx === -1) {
        sendError(res, 'Property not found', 404);
        return;
      }
      inMemoryProperties.splice(idx, 1);
      sendSuccess(res, null, 'Property deleted in memory fallback');
      return;
    }

    const property = await Property.findById(req.params.id);

    if (!property) {
      sendError(res, 'Property not found', 404);
      return;
    }

    if (
      (property.owner?._id?.toString() ?? property.owner?.toString()) !== req.user!.userId &&
      req.user!.role !== 'admin'
    ) {
      sendError(res, 'Not authorized', 403);
      return;
    }

    await Property.findByIdAndDelete(req.params.id);
    sendSuccess(res, null, 'Property deleted');
  } catch (error) {
    sendError(res, 'Failed to delete property', 500);
  }
}

export async function getOwnerProperties(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const query = req.query as unknown as PropertyQuery;
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const skip = (page - 1) * limit;

    if (!isDatabaseConnected) {
      initInMemoryStore();
      const list = inMemoryProperties.filter(p => p.owner === req.user?.userId || p.owner?._id === req.user?.userId);
      sendSuccess(res, list);
      return;
    }

    const filter: Record<string, unknown> = {
      owner: req.user!.userId,
    };

    if (query.status) filter.status = query.status;

    const [properties, total] = await Promise.all([
      Property.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Property.countDocuments(filter),
    ]);

    sendPaginated(res, properties, total, page, limit);
  } catch (error) {
    sendError(res, 'Failed to fetch owner properties', 500);
  }
}
