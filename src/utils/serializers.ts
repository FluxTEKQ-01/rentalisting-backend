import type { PropertyDoc } from '../repositories/propertyRepository.js';

/**
 * Convert a Supabase `properties` row into the API shape the frontend consumes.
 *
 * The migration plan promised an unchanged API surface, but the repositories
 * started returning raw Postgres rows: flat `city`/`state`/`address`/`zip_code`
 * columns instead of a nested `location` object, and `property_images` rows
 * instead of `images: [{ url, publicId }]`.
 *
 * The frontend reads `property.location.city` unguarded, so raw rows crash the
 * whole React tree ("Cannot read properties of undefined (reading 'city')") and
 * every listing page renders blank. Serializing here fixes every consumer at
 * once — public list, detail, owner dashboard, admin review and SEO pages.
 */
export function serializeProperty(property: PropertyDoc | null): any {
  if (!property) return property;

  const owner = property.owner
    ? {
        _id: property.owner.id,
        id: property.owner.id,
        name: property.owner.name,
        email: property.owner.email,
        mobile: property.owner.mobile,
        avatar: property.owner.avatar || '',
      }
    : property.owner_id;

  return {
    _id: property.id,
    id: property.id,
    slug: property.slug,
    title: property.title,
    description: property.description,
    propertyType: property.property_type,
    price: Number(property.price),
    maxPrice: property.max_price === null || property.max_price === undefined
      ? undefined
      : Number(property.max_price),
    currency: property.currency,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    area: Number(property.area),
    maxArea: property.max_area === null || property.max_area === undefined
      ? undefined
      : Number(property.max_area),
    areaUnit: property.area_unit,
    amenities: property.amenities || [],
    videoUrl: property.video_url || '',
    images: (property.images || []).map((image) => ({
      url: image.url,
      publicId: image.public_id,
    })),
    location: {
      address: property.address || '',
      city: property.city || '',
      state: property.state || '',
      zipCode: property.zip_code || '',
      coordinates: {
        lat: Number(property.lat) || 0,
        lng: Number(property.lng) || 0,
      },
    },
    owner,
    ownerId: property.owner_id,
    status: property.status,
    feedback: property.feedback || '',
    feedbackProvidedAt: property.feedback_provided_at,
    reviewedBy: property.reviewed_by,
    reviewedAt: property.reviewed_at,
    createdAt: property.created_at,
    updatedAt: property.updated_at,
  };
}

export function serializeProperties(properties: PropertyDoc[]): any[] {
  return properties.map((p) => serializeProperty(p));
}
