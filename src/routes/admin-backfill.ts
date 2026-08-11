import { Router } from 'express';
import { MongoClient } from 'mongodb';
import { supabaseClient } from '../config/supabase.js';
import { hashPassword } from '../utils/password.js';

const router = Router();

// Temporary backfill endpoint - copies missing records from MongoDB to Supabase
// DELETE THIS FILE AND ROUTE AFTER USE
router.post('/backfill-missing-data', async (req, res) => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      return res.status(400).json({ error: 'MONGODB_URI not configured' });
    }

    const client = new MongoClient(mongoUri, {
      connectTimeoutMS: 5000,
      socketTimeoutMS: 5000,
    });

    let results: Record<string, any> = {
      users_copied: 0,
      properties_copied: 0,
      notifications_copied: 0,
      errors: [],
    };

    try {
      await client.connect();
      const db = client.db();

      // 1. Backfill Users
      try {
        const mongoUsers = await db.collection('users').find({}).toArray();
        const { data: supabaseUsers } = await supabaseClient.from('users').select('email');
        const supabaseEmails = new Set(supabaseUsers?.map((u: any) => u.email) || []);

        for (const mongoUser of mongoUsers) {
          if (!supabaseEmails.has(mongoUser.email)) {
            const { error } = await supabaseClient.from('users').insert({
              id: mongoUser._id?.toString().replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5'),
              name: mongoUser.name,
              email: mongoUser.email,
              mobile: mongoUser.mobile,
              password_hash: mongoUser.password || '',
              role: mongoUser.role || 'visitor',
              avatar: mongoUser.avatar || '',
              is_active: mongoUser.isActive !== false,
              created_at: mongoUser.createdAt?.toISOString() || new Date().toISOString(),
              updated_at: mongoUser.updatedAt?.toISOString() || new Date().toISOString(),
            });

            if (error) {
              results.errors.push(`User ${mongoUser.email}: ${error.message}`);
            } else {
              results.users_copied++;
            }
          }
        }
      } catch (e) {
        results.errors.push(`Users backfill failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }

      // 2. Backfill Properties
      try {
        const mongoProperties = await db.collection('properties').find({}).toArray();
        const { data: supabaseProps } = await supabaseClient.from('properties').select('id');
        const supabasePropIds = new Set(supabaseProps?.map((p: any) => p.id) || []);

        for (const mongoProp of mongoProperties) {
          const propId = mongoProp._id?.toString().replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
          if (!supabasePropIds.has(propId)) {
            // Get owner UUID from Supabase
            const { data: ownerData } = await supabaseClient
              .from('users')
              .select('id')
              .eq('email', (await db.collection('users').findOne({ _id: mongoProp.owner }))?.email || '')
              .single();

            const ownerId = ownerData?.id || '00000000-0000-0000-0000-000000000000';

            const { error } = await supabaseClient.from('properties').insert({
              id: propId,
              title: mongoProp.title,
              description: mongoProp.description,
              property_type: mongoProp.propertyType,
              price: mongoProp.price,
              max_price: mongoProp.maxPrice,
              currency: mongoProp.currency || 'INR',
              bedrooms: mongoProp.bedrooms || 0,
              bathrooms: mongoProp.bathrooms || 0,
              area: mongoProp.area,
              max_area: mongoProp.maxArea,
              area_unit: mongoProp.areaUnit || 'sqft',
              amenities: mongoProp.amenities || [],
              video_url: mongoProp.videoUrl || '',
              address: mongoProp.location?.address || '',
              city: mongoProp.location?.city,
              state: mongoProp.location?.state || '',
              zip_code: mongoProp.location?.zipCode || '',
              lat: mongoProp.location?.coordinates?.lat || 0,
              lng: mongoProp.location?.coordinates?.lng || 0,
              owner_id: ownerId,
              slug: mongoProp.slug || mongoProp.title.toLowerCase().replace(/\s+/g, '-'),
              status: mongoProp.status || 'draft',
              feedback: mongoProp.feedback || '',
              feedback_provided_at: mongoProp.feedbackProvidedAt?.toISOString(),
              reviewed_by: mongoProp.reviewedBy?.toString().replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5'),
              reviewed_at: mongoProp.reviewedAt?.toISOString(),
              created_at: mongoProp.createdAt?.toISOString() || new Date().toISOString(),
              updated_at: mongoProp.updatedAt?.toISOString() || new Date().toISOString(),
            });

            if (error) {
              results.errors.push(`Property ${mongoProp.title}: ${error.message}`);
            } else {
              results.properties_copied++;

              // Copy property images if any
              if (mongoProp.images && mongoProp.images.length > 0) {
                const imagesToInsert = mongoProp.images.map((img: any, idx: number) => ({
                  property_id: propId,
                  url: img.url,
                  public_id: img.publicId,
                  sort_order: idx,
                }));

                await supabaseClient.from('property_images').insert(imagesToInsert);
              }
            }
          }
        }
      } catch (e) {
        results.errors.push(`Properties backfill failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }

      // 3. Backfill Notifications (if needed)
      try {
        const mongoNotifications = await db.collection('notifications').find({}).toArray();
        const { count: supabaseNotifCount } = await supabaseClient
          .from('notifications')
          .select('*', { count: 'exact', head: true });

        if ((supabaseNotifCount || 0) < mongoNotifications.length) {
          const { data: supabaseNotifs } = await supabaseClient.from('notifications').select('id');
          const supabaseNotifIds = new Set(supabaseNotifs?.map((n: any) => n.id) || []);

          for (const mongoNotif of mongoNotifications) {
            const notifId = mongoNotif._id?.toString().replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
            if (!supabaseNotifIds.has(notifId)) {
              const { data: recipientData } = await supabaseClient
                .from('users')
                .select('id')
                .eq('email', (await db.collection('users').findOne({ _id: mongoNotif.recipient }))?.email || '')
                .single();

              const recipientId = recipientData?.id || '00000000-0000-0000-0000-000000000000';

              const { error } = await supabaseClient.from('notifications').insert({
                id: notifId,
                recipient_id: recipientId,
                type: mongoNotif.type,
                title: mongoNotif.title,
                message: mongoNotif.message,
                metadata: mongoNotif.metadata || {},
                is_read: mongoNotif.isRead || false,
                created_at: mongoNotif.createdAt?.toISOString() || new Date().toISOString(),
              });

              if (!error) {
                results.notifications_copied++;
              }
            }
          }
        }
      } catch (e) {
        results.errors.push(`Notifications backfill failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    } finally {
      await client.close();
    }

    res.json({
      status: 'success',
      message: 'Backfill completed',
      results,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
