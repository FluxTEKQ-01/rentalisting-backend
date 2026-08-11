-- BookMySpace Supabase PostgreSQL Schema
-- Complete DDL for MongoDB → PostgreSQL migration
-- Date: 2026-08-10
-- Status: Ready for review and manual execution in Supabase SQL Editor

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- pgcrypto provides gen_random_uuid() and other cryptographic functions


-- ============================================================================
-- ENUMS (Custom Types)
-- ============================================================================

CREATE TYPE user_role AS ENUM (
  'visitor',
  'owner',
  'admin'
);

CREATE TYPE property_type AS ENUM (
  'office',
  'shop_retail',
  'warehouse',
  'house_apartment',
  'apartment',
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
  'storage'
);

CREATE TYPE property_status AS ENUM (
  'draft',
  'submitted',
  'pending_review',
  'approved',
  'rejected',
  'published',
  'archived'
);

CREATE TYPE notification_type AS ENUM (
  'listing_submitted',
  'listing_approved',
  'listing_rejected',
  'listing_resubmitted',
  'feedback_available',
  'listing_published',
  'new_submission',
  'new_review',
  'inquiry'
);


-- ============================================================================
-- USERS TABLE
-- ============================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL CHECK (char_length(name) >= 2),
  email VARCHAR(255) NOT NULL UNIQUE,
  mobile VARCHAR(20) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'owner',
  avatar TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_role ON users(role);

COMMENT ON TABLE users IS 'User accounts (owners, admins, visitors)';
COMMENT ON COLUMN users.id IS 'Unique identifier (UUID, was ObjectId)';
COMMENT ON COLUMN users.password_hash IS 'Bcryptjs hashed password (select:false in API responses)';
COMMENT ON COLUMN users.role IS 'User role: visitor (browse only), owner (create listings), admin (moderate)';
COMMENT ON COLUMN users.is_active IS 'Soft-deletion flag; false = account deactivated but data retained';


-- ============================================================================
-- PROPERTIES TABLE (Main Listings)
-- ============================================================================

CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL CHECK (char_length(title) >= 5),
  description TEXT NOT NULL CHECK (char_length(description) >= 20),
  property_type property_type NOT NULL,
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  max_price NUMERIC(12,2) CHECK (max_price >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  bedrooms INT NOT NULL DEFAULT 0 CHECK (bedrooms >= 0),
  bathrooms INT NOT NULL DEFAULT 0 CHECK (bathrooms >= 0),
  area NUMERIC(12,2) NOT NULL CHECK (area >= 0),
  max_area NUMERIC(12,2) CHECK (max_area >= 0),
  area_unit VARCHAR(20) NOT NULL DEFAULT 'sqft',
  amenities TEXT[] NOT NULL DEFAULT '{}',
  video_url TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) DEFAULT '',
  zip_code VARCHAR(20) DEFAULT '',
  lat DOUBLE PRECISION DEFAULT 0,
  lng DOUBLE PRECISION DEFAULT 0,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status property_status NOT NULL DEFAULT 'draft',
  feedback TEXT DEFAULT '',
  feedback_provided_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  search_vector TSVECTOR GENERATED ALWAYS AS
    (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')))
    STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_owner ON properties(owner_id);
CREATE INDEX idx_properties_city ON properties(city);
CREATE INDEX idx_properties_type ON properties(property_type);
CREATE INDEX idx_properties_price ON properties(price);
CREATE INDEX idx_properties_search ON properties USING gin(search_vector);

COMMENT ON TABLE properties IS 'Rental and commercial property listings with admin review workflow';
COMMENT ON COLUMN properties.id IS 'Unique identifier (UUID, was ObjectId)';
COMMENT ON COLUMN properties.property_type IS 'Category: office, apartment, villa, warehouse, etc.';
COMMENT ON COLUMN properties.status IS 'Listing state: draft → submitted → pending_review → approved → published';
COMMENT ON COLUMN properties.search_vector IS 'Full-text search index (auto-generated tsvector from title + description)';
COMMENT ON COLUMN properties.owner_id IS 'Foreign key to users table (owner of this listing)';


-- ============================================================================
-- PROPERTY_IMAGES TABLE (Normalized from embedded Property.images[])
-- ============================================================================

CREATE TABLE property_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  public_id TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_property_images_property ON property_images(property_id);

COMMENT ON TABLE property_images IS 'Cloudinary image references for each property (normalized from embedded Property.images[])';
COMMENT ON COLUMN property_images.url IS 'Cloudinary CDN URL';
COMMENT ON COLUMN property_images.public_id IS 'Cloudinary asset public ID (for updates/deletes)';
COMMENT ON COLUMN property_images.sort_order IS 'Display order in gallery (0 = primary image)';


-- ============================================================================
-- REVIEWS TABLE
-- ============================================================================

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name VARCHAR(150) NOT NULL DEFAULT 'Verified Visitor',
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reviews_property ON reviews(property_id);

COMMENT ON TABLE reviews IS 'User ratings and comments on properties';
COMMENT ON COLUMN reviews.user_id IS 'Optional foreign key to users (nullable for anonymous reviews)';
COMMENT ON COLUMN reviews.rating IS 'Rating from 1 (poor) to 5 (excellent)';


-- ============================================================================
-- COMMENTS TABLE
-- ============================================================================

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL,
  address TEXT DEFAULT '',
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comments_property_created ON comments(property_id, created_at DESC);

COMMENT ON TABLE comments IS 'Public comments/feedback on properties (no auth required to post)';
COMMENT ON COLUMN comments.name IS 'Commenter name (not linked to user account)';


-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_recipient_created ON notifications(recipient_id, created_at DESC);
CREATE INDEX idx_notifications_recipient_unread ON notifications(recipient_id, is_read);

COMMENT ON TABLE notifications IS 'User notifications (listing approvals, rejections, reviews, inquiries)';
COMMENT ON COLUMN notifications.type IS 'Type: listing_approved, listing_rejected, new_review, etc.';
COMMENT ON COLUMN notifications.metadata IS 'Flexible JSON payload (e.g., {propertyId: "...", feedback: "..."})';


-- ============================================================================
-- REFRESH_TOKENS TABLE (Optional, new capability for stateful token management)
-- ============================================================================

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);

COMMENT ON TABLE refresh_tokens IS 'Optional: stateful refresh token management (not required; JWT is stateless by default)';
COMMENT ON COLUMN refresh_tokens.token_hash IS 'Hash of the JWT token (for lookup without storing full token)';
COMMENT ON COLUMN refresh_tokens.revoked_at IS 'Null if active; set to now() when logged out or rotated';


-- ============================================================================
-- PROPERTY_STATUS_HISTORY TABLE (Optional, new feature for admin audit trail)
-- ============================================================================

CREATE TABLE property_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  from_status property_status,
  to_status property_status NOT NULL,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_status_history_property ON property_status_history(property_id, created_at DESC);

COMMENT ON TABLE property_status_history IS 'Audit trail: tracks every listing status change (submit, approve, reject, archive)';
COMMENT ON COLUMN property_status_history.from_status IS 'Previous status (null if this is the first change from default draft)';
COMMENT ON COLUMN property_status_history.changed_by IS 'Admin who made the change (nullable if system-generated)';


-- ============================================================================
-- TRIGGER FUNCTION: Auto-update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
  RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to users table
CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Apply trigger to properties table
CREATE TRIGGER set_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Apply trigger to reviews table
CREATE TRIGGER set_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

COMMENT ON FUNCTION set_updated_at() IS 'Automatically set updated_at to now() on INSERT/UPDATE';


-- ============================================================================
-- SEED HELPER (Optional: for testing, can be removed)
-- ============================================================================

-- Example: Insert a test user
-- INSERT INTO users (name, email, mobile, password_hash, role)
-- VALUES ('Test User', 'test@example.com', '+919876543210', '$2a$12$...hashed...', 'owner');


-- ============================================================================
-- NOTES FOR EXECUTION
-- ============================================================================

-- 1. BACKUP: Before running this script, take a snapshot of your Supabase project
--    (Settings > Backups > Request Manual Backup, or use pg_dump)

-- 2. EXECUTION: Run this entire script in the Supabase SQL Editor or via psql:
--    psql -h <host> -U postgres -d postgres -f 05-supabase-schema.sql

-- 3. VERIFICATION: After execution, verify all tables exist:
--    SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- 4. INDEXES: Confirm all indexes are created:
--    SELECT indexname FROM pg_indexes WHERE schemaname = 'public';

-- 5. ENUMS: Verify enum types are defined:
--    SELECT typname FROM pg_type WHERE typkind = 'e';

-- 6. NEXT STEP: Run Phase 3 data migration script (scripts/migrate-to-supabase.ts)
--    to populate tables from MongoDB backups.

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
