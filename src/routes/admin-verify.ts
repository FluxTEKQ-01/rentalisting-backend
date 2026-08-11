import { Router } from 'express';
import { MongoClient } from 'mongodb';
import { supabaseClient } from '../config/supabase.js';

const router = Router();

// Temporary verification endpoint - compares MongoDB vs Supabase record counts
// DELETE THIS FILE AND ROUTE AFTER USE
router.get('/verify-data-parity', async (req, res) => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      return res.status(400).json({ error: 'MONGODB_URI not configured' });
    }

    const client = new MongoClient(mongoUri, {
      connectTimeoutMS: 5000,
      socketTimeoutMS: 5000,
    });

    let mongoData: Record<string, number> = {};
    let supabaseData: Record<string, number> = {};

    try {
      // Connect to MongoDB
      await client.connect();
      const db = client.db();

      // Count documents in each collection
      mongoData = {
        users: await db.collection('users').countDocuments(),
        properties: await db.collection('properties').countDocuments(),
        reviews: await db.collection('reviews').countDocuments(),
        comments: await db.collection('comments').countDocuments(),
        notifications: await db.collection('notifications').countDocuments(),
      };
    } finally {
      await client.close();
    }

    // Count rows in Supabase tables
    const tables = ['users', 'properties', 'reviews', 'comments', 'notifications'];
    for (const table of tables) {
      const { count, error } = await supabaseClient
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        supabaseData[table] = -1; // Error indicator
      } else {
        supabaseData[table] = count || 0;
      }
    }

    // Build comparison table
    const comparison = tables.map((table) => ({
      table,
      mongodb: mongoData[table] ?? 'N/A',
      supabase: supabaseData[table],
      match: mongoData[table] === supabaseData[table],
    }));

    res.json({
      status: 'success',
      comparison,
      summary: {
        totalMongo: Object.values(mongoData).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0),
        totalSupabase: Object.values(supabaseData).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0),
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
