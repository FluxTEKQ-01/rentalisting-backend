import { Request, Response } from 'express';
import { propertyRepository } from '../repositories/propertyRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { notificationRepository } from '../repositories/notificationRepository.js';
import { sendSuccess, sendError, sendPaginated } from '../utils/apiResponse.js';
import { serializeProperty, serializeProperties } from '../utils/serializers.js';
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
    apartment: [
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

  const urls = imagesMap[propertyType] || imagesMap.house_apartment || imagesMap.office;
  return urls.map((url, index) => ({
    url,
    publicId: `auto_configured_${propertyType}_${index}`
  }));
}

export function resolvePropertyCoordinates(location: any): { lat: number; lng: number } {
  if (location?.coordinates?.lat && location?.coordinates?.lng) {
    const lat = Number(location.coordinates.lat);
    const lng = Number(location.coordinates.lng);
    if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
      return { lat, lng };
    }
  }

  const fullText = [
    location?.address,
    location?.city,
    location?.state,
    location?.zipCode,
  ].filter(Boolean).join(' ').toLowerCase();

  const pincodeMap: Record<string, [number, number]> = {
    '560066': [12.9698, 77.7499], // Whitefield
    '560038': [12.9784, 77.6408], // Indiranagar
    '560034': [12.9352, 77.6245], // Koramangala
    '560102': [12.9121, 77.6446], // HSR Layout
    '560037': [12.9592, 77.6974], // Marathahalli
    '560103': [12.9304, 77.6784], // Bellandur
    '560100': [12.8452, 77.6602], // Electronic City
    '560041': [12.9250, 77.5938], // Jayanagar
    '560078': [12.9077, 77.5854], // JP Nagar
    '500032': [17.4401, 78.3489], // Gachibowli
    '500081': [17.4483, 78.3915], // Madhapur
    '500033': [17.4319, 78.4071], // Jubilee Hills
    '500034': [17.4156, 78.4411], // Banjara Hills
    '400050': [19.0596, 72.8295], // Bandra
    '400053': [19.1363, 72.8277], // Andheri
    '400076': [19.1176, 72.9060], // Powai
    '122002': [28.4735, 77.0863], // Gurgaon
    '201301': [28.5708, 77.3260], // Noida
    whitefield: [12.9698, 77.7499],
    indiranagar: [12.9784, 77.6408],
    koramangala: [12.9352, 77.6245],
    hsr: [12.9121, 77.6446],
    marathahalli: [12.9592, 77.6974],
    bellandur: [12.9304, 77.6784],
    gachibowli: [17.4401, 78.3489],
    madhapur: [17.4483, 78.3915],
    bandra: [19.0596, 72.8295],
    andheri: [19.1363, 72.8277],
    powai: [19.1176, 72.9060],
  };

  for (const [key, coords] of Object.entries(pincodeMap)) {
    if (fullText.includes(key)) {
      return { lat: coords[0], lng: coords[1] };
    }
  }

  const cityKey = (location?.city || '').toLowerCase().trim();
  const cityMap: Record<string, [number, number]> = {
    hyderabad: [17.3850, 78.4867],
    bengaluru: [12.9716, 77.5946],
    bangalore: [12.9716, 77.5946],
    mumbai: [19.0760, 72.8777],
    delhi: [28.6139, 77.2090],
    chennai: [13.0827, 80.2707],
    pune: [18.5204, 73.8567],
    kolkata: [22.5726, 88.3639],
    gurgaon: [28.4595, 77.0266],
    noida: [28.5355, 77.3910],
  };

  if (cityMap[cityKey]) return { lat: cityMap[cityKey][0], lng: cityMap[cityKey][1] };
  for (const [key, coords] of Object.entries(cityMap)) {
    if (cityKey.includes(key) || key.includes(cityKey)) {
      return { lat: coords[0], lng: coords[1] };
    }
  }

  return { lat: 17.3850, lng: 78.4867 };
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

    if (location) {
      location.coordinates = resolvePropertyCoordinates(location);
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

    const property = await propertyRepository.create({
      title, description, propertyType, price, maxPrice, bedrooms, bathrooms, area, maxArea,
      amenities, videoUrl, address: location.address, city: location.city, state: location.state, zipCode: location.zipCode,
      lat: location.coordinates?.lat, lng: location.coordinates?.lng,
      images,
      owner_id: req.user!.userId,
    });
    sendSuccess(res, { property: serializeProperty(property) }, 'Property created', 201);
  } catch (error: any) {
    console.error('Property creation error:', error);
    const message = error?.message || error?.details?.message || 'Failed to create property';
    sendError(res, message, 500, { error: error?.code });
  }
}

// Values accepted by the Postgres `property_type` enum. Anything outside this
// list makes the query fail with 22P02 (invalid input value for enum), which
// MongoDB tolerated silently but Postgres rejects with a 500.
const PROPERTY_TYPE_ENUM = new Set([
  'office', 'shop_retail', 'warehouse', 'house_apartment', 'apartment', 'villa',
  'open_plot_land', 'event_venue', 'coworking', 'commercial_building', 'parking',
  'showroom', 'industrial', 'hotel_banquet', 'shooting_location', 'storage',
]);

// Legacy/shorthand aliases accepted from URLs, mapped onto real enum values
const PROPERTY_TYPE_ALIASES: Record<string, string[]> = {
  house: ['house_apartment', 'apartment'],
  apartments: ['house_apartment', 'apartment'],
  house_apartment: ['house_apartment', 'apartment'],
  apartment: ['house_apartment', 'apartment'],
  shop: ['shop_retail'],
  retail: ['shop_retail'],
  plot: ['open_plot_land'],
  land: ['open_plot_land'],
};

export function expandPropertyTypes(typeQuery: string): string[] {
  const rawTypes = typeQuery.split(',').map(t => t.trim()).filter(Boolean);
  const typesSet = new Set<string>();

  for (const t of rawTypes) {
    for (const mapped of PROPERTY_TYPE_ALIASES[t] || [t]) {
      if (PROPERTY_TYPE_ENUM.has(mapped)) typesSet.add(mapped);
    }
  }

  return Array.from(typesSet);
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
        const expandedTypes = expandPropertyTypes(query.propertyType);
        list = list.filter(p => expandedTypes.includes(p.propertyType));
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
          p.location?.city?.toLowerCase().includes(kw) ||
          p.location?.address?.toLowerCase().includes(kw) ||
          (p.propertyType && p.propertyType.toLowerCase().includes(kw))
        );
      }

      sendPaginated(res, list.slice(skip, skip + limit), list.length, page, limit);
      return;
    }

    // Build Supabase-compatible filters
    const filters: any = {};

    // Handle status filter
    if (req.user?.role === 'admin') {
      if (query.status) {
        filters.status = query.status.includes(',') ? query.status.split(',') : query.status;
      }
    } else if (!req.user?.role) {
      // Anonymous visitors must only ever see published listings
      filters.status = 'published';
    } else if (req.user.role === 'owner') {
      filters.status = query.status ? query.status.split(',').concat(['published']) : ['published'];
    } else {
      filters.status = 'published';
    }

    if (query.owner) filters.owner_id = query.owner;

    if (query.propertyType) {
      const expandedTypes = expandPropertyTypes(query.propertyType);
      filters.propertyType = expandedTypes;
    }

    if (query.keyword) {
      filters.keyword = query.keyword;
    }

    const city = query.city || query.location;
    if (city) {
      filters.city = city as string;
    }

    if (query.minPrice) {
      filters.priceMin = parseInt(query.minPrice, 10);
    }
    if (query.maxPrice) {
      filters.priceMax = parseInt(query.maxPrice, 10);
    }

    if (query.bedrooms) {
      filters.bedrooms = parseInt(query.bedrooms, 10);
    }
    if (query.bathrooms) {
      filters.bathrooms = parseInt(query.bathrooms, 10);
    }

    if (query.minArea) {
      filters.areaMin = parseFloat(query.minArea);
    }
    if (query.maxArea) {
      filters.areaMax = parseFloat(query.maxArea);
    }

    if (query.amenities) {
      filters.amenities = query.amenities.split(',');
    }

    let sortBy = 'created_at';
    let order: 'asc' | 'desc' = 'desc';
    switch (query.sort) {
      case 'oldest':
        order = 'asc';
        break;
      case 'price_low':
        sortBy = 'price';
        order = 'asc';
        break;
      case 'price_high':
        sortBy = 'price';
        order = 'desc';
        break;
    }

    const [properties, total] = await Promise.all([
      propertyRepository.find({ ...filters, skip, limit, sort: sortBy, order }),
      propertyRepository.countDocuments(filters),
    ]);

    sendPaginated(res, serializeProperties(properties), total, page, limit);
  } catch (error: any) {
    // Supabase errors carry code/details/hint rather than a useful `message`,
    // so log the parts explicitly instead of an empty-looking object.
    console.error('Error in getProperties:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    });
    sendError(res, 'Failed to fetch properties', 500);
  }
}

export async function getPropertyById(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const id = req.params.id as string;
    if (!isDatabaseConnected) {
      initInMemoryStore();
      const property = inMemoryProperties.find(p => p._id === id);
      if (!property) {
        sendError(res, 'Property not found', 404);
        return;
      }
      sendSuccess(res, { property });
      return;
    }

    // Find by UUID or slug (backward-compatible)
    const property = await propertyRepository.findByIdOrSlug(id);

    if (!property) {
      sendError(res, 'Property not found', 404);
      return;
    }

    if (
      property.status !== 'published' &&
      req.user?.role !== 'admin' &&
      property.owner_id !== req.user?.userId
    ) {
      sendError(res, 'Property not found', 404);
      return;
    }

    sendSuccess(res, { property: serializeProperty(property) });
  } catch (error: any) {
    console.error('Error fetching property by id:', error);
    sendError(res, error?.message || 'Failed to fetch property', 500);
  }
}

export async function updateProperty(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    let { title, description, propertyType, price, maxPrice, bedrooms, bathrooms, area, maxArea, amenities, videoUrl, location, images } = req.body;

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

    const id = req.params.id as string;
    const property = await propertyRepository.findById(id);

    if (!property) {
      sendError(res, 'Property not found', 404);
      return;
    }

    if (
      property.owner_id !== req.user!.userId &&
      req.user!.role !== 'admin'
    ) {
      sendError(res, 'Not authorized to update this property', 403);
      return;
    }

    if (property.status === 'published' && req.user!.role !== 'admin') {
      sendError(res, 'Published properties cannot be edited', 403);
      return;
    }

    const updateData: any = {};
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
    if (location !== undefined) {
      const coords = resolvePropertyCoordinates(location);
      updateData.address = location.address;
      updateData.city = location.city;
      updateData.state = location.state;
      updateData.zipCode = location.zipCode;
      updateData.lat = coords.lat;
      updateData.lng = coords.lng;
    }

    const updatedProperty = await propertyRepository.findByIdAndUpdate(id, updateData);

    if (!updatedProperty) {
      sendError(res, 'Failed to update property', 500);
      return;
    }

    // Images live in a child table, so they need their own write
    if (Array.isArray(images)) {
      updatedProperty.images = await propertyRepository.replaceImages(id, images);
    } else {
      updatedProperty.images = await propertyRepository.getImages(id);
    }

    sendSuccess(res, { property: serializeProperty(updatedProperty) }, 'Property updated');
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

    const id = req.params.id as string;
    const property = await propertyRepository.findById(id);

    if (!property) {
      sendError(res, 'Property not found', 404);
      return;
    }

    if (property.owner_id !== req.user!.userId) {
      sendError(res, 'Not authorized', 403);
      return;
    }

    if (property.status === 'published') {
      sendError(res, 'Property is already published', 400);
      return;
    }

    await propertyRepository.updateStatus(id, 'submitted');

    const admins = await userRepository.findByRole('admin');
    const notifications = admins.map((admin) => ({
      recipient_id: admin.id,
      type: 'new_submission' as const,
      title: 'New Listing Submitted',
      message: `Property "${property.title}" has been submitted for review.`,
      metadata: { propertyId: property.id },
    }));
    await notificationRepository.createBulk(notifications);

    sendSuccess(res, { property: serializeProperty(property) }, 'Property submitted for review');
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

    const id = req.params.id as string;
    const property = await propertyRepository.findById(id);

    if (!property) {
      sendError(res, 'Property not found', 404);
      return;
    }

    if (property.owner_id !== req.user!.userId) {
      sendError(res, 'Not authorized', 403);
      return;
    }

    if (property.status !== 'rejected') {
      sendError(res, 'Only rejected properties can be resubmitted', 400);
      return;
    }

    const { title, description, propertyType, price, maxPrice, bedrooms, bathrooms, area, maxArea, amenities, videoUrl, location, images } = req.body;

    const updates: any = {};
    if (title) updates.title = title;
    if (description) updates.description = description;
    if (propertyType) updates.propertyType = propertyType;
    if (price !== undefined) updates.price = price;
    if (maxPrice !== undefined) updates.maxPrice = maxPrice;
    if (bedrooms !== undefined) updates.bedrooms = bedrooms;
    if (bathrooms !== undefined) updates.bathrooms = bathrooms;
    if (area !== undefined) updates.area = area;
    if (maxArea !== undefined) updates.maxArea = maxArea;
    if (amenities) updates.amenities = amenities;
    if (videoUrl !== undefined) updates.videoUrl = videoUrl;
    if (location) {
      const coords = resolvePropertyCoordinates(location);
      updates.address = location.address;
      updates.city = location.city;
      updates.state = location.state;
      updates.zipCode = location.zipCode;
      updates.lat = coords.lat;
      updates.lng = coords.lng;
    }
    updates.status = 'pending_review';
    updates.feedback = '';

    const updated = await propertyRepository.findByIdAndUpdate(id, updates);

    if (!updated) {
      sendError(res, 'Failed to update property', 500);
      return;
    }

    if (Array.isArray(images)) {
      updated.images = await propertyRepository.replaceImages(id, images);
    } else {
      updated.images = await propertyRepository.getImages(id);
    }

    const admins = await userRepository.findByRole('admin');
    const notifications = admins.map((admin) => ({
      recipient_id: admin.id,
      type: 'listing_resubmitted' as const,
      title: 'Listing Resubmitted',
      message: `Property "${updated.title}" has been resubmitted for review.`,
      metadata: { propertyId: updated.id },
    }));
    await notificationRepository.createBulk(notifications);

    sendSuccess(res, { property: serializeProperty(updated) }, 'Property resubmitted for review');
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

    const id = req.params.id as string;
    const property = await propertyRepository.findById(id);

    if (!property) {
      sendError(res, 'Property not found', 404);
      return;
    }

    if (
      property.owner_id !== req.user!.userId &&
      req.user!.role !== 'admin'
    ) {
      sendError(res, 'Not authorized', 403);
      return;
    }

    await propertyRepository.findByIdAndDelete(id);
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

    const [properties, total] = await Promise.all([
      propertyRepository.find({
        owner_id: req.user!.userId,
        status: query.status,
        skip,
        limit,
        sort: 'created_at',
        order: 'desc',
      }),
      propertyRepository.countByOwner(req.user!.userId, query.status),
    ]);

    sendPaginated(res, serializeProperties(properties), total, page, limit);
  } catch (error) {
    sendError(res, 'Failed to fetch owner properties', 500);
  }
}

export async function contactPropertyOwner(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { name, email, phone, message } = req.body;

    if (!name || !email || !message) {
      sendError(res, 'Name, email, and message are required fields', 400);
      return;
    }

    let property: any = null;
    const propertyIdStr = String(id);
    property = await propertyRepository.findById(propertyIdStr);

    if (!property) {
      property = inMemoryProperties.find((p) => p._id === propertyIdStr);
    }

    if (!property) {
      sendError(res, 'Property not found', 404);
      return;
    }

    const ownerId = property.owner_id;
    let ownerEmail: string | undefined;

    if (ownerId) {
      const owner = await userRepository.findById(ownerId);
      ownerEmail = owner?.email;

      await notificationRepository.create({
        recipient_id: ownerId,
        type: 'inquiry',
        title: `New Inquiry for ${property.title}`,
        message: `${name} (${email}${phone ? `, Ph: ${phone}` : ''}) sent an inquiry: "${message}"`,
        metadata: {
          propertyId: property.id,
          propertyTitle: property.title,
          senderName: name,
          senderEmail: email,
          senderPhone: phone || '',
          senderMessage: message,
        },
      });
    }

    console.log(`[Inquiry Sent] Property "${property.title}" - From: ${name} (${email}) - Message: ${message}`);

    sendSuccess(
      res,
      {
        inquirySent: true,
        propertyTitle: property.title,
        ownerEmail,
      },
      'Inquiry sent successfully to the property owner!'
    );
  } catch (error) {
    console.error('Error in contactPropertyOwner:', error);
    sendError(res, 'Failed to send inquiry to property owner', 500);
  }
}
