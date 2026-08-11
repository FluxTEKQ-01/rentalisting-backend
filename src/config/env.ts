import dotenv from 'dotenv';
dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Normalise a configured CORS entry into a comparable origin.
// Accepts bare hostnames ("www.example.com") as well as full origins, and
// drops any trailing slash or path. Returns null for unusable entries.
function normalizeOrigin(entry: string): string | null {
  const trimmed = entry.trim().replace(/\/+$/, '');
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withScheme).origin;
  } catch {
    return null;
  }
}

// Every configured origin, plus the www/apex counterpart of each, so a single
// missing entry in CORS_ORIGIN cannot lock the whole site out of the API.
function buildCorsOrigins(raw: string): string[] {
  const origins = new Set<string>();

  for (const entry of raw.split(',')) {
    const origin = normalizeOrigin(entry);
    if (!origin) continue;
    origins.add(origin);

    const url = new URL(origin);
    if (url.hostname.startsWith('www.')) {
      url.hostname = url.hostname.slice(4);
    } else if (url.hostname.includes('.') && !url.hostname.endsWith('localhost')) {
      url.hostname = `www.${url.hostname}`;
    }
    origins.add(url.origin);
  }

  return [...origins];
}

export const env = {
  port: parseInt(process.env.PORT || '5000', 10),
  jwtSecret: requireEnv('JWT_SECRET'),
  jwtRefreshSecret: requireEnv('JWT_REFRESH_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  // CORS origins can be comma-separated, with or without the scheme
  corsOrigin: buildCorsOrigins(process.env.CORS_ORIGIN || 'https://rentalisting.vercel.app'),
  // Supabase PostgreSQL (Phase 2+ migration target)
  supabaseUrl: requireEnv('SUPABASE_URL'),
  supabaseServiceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
};
