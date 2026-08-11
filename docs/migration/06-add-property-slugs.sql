-- Phase 6: Add property slug column and backfill existing rows
-- This SQL script should be run in the Supabase SQL Editor

-- 1. Add slug column as UNIQUE (allows NULL for backward-compatibility during rollout)
ALTER TABLE properties
ADD COLUMN slug text UNIQUE;

-- 2. Backfill existing properties with slugs derived from title
-- Uses lowercase, replaces non-alphanumeric chars with hyphens, appends first 6 chars of UUID for uniqueness
UPDATE properties
SET slug = lower(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(id::text, 1, 6)
WHERE slug IS NULL;

-- 3. Make slug NOT NULL after backfill is complete
ALTER TABLE properties
ALTER COLUMN slug SET NOT NULL;

-- 4. Create index on slug for fast lookups (optional but recommended)
CREATE INDEX idx_properties_slug ON properties(slug);

-- Verify: should show all properties now have slugs
SELECT id, title, slug FROM properties ORDER BY created_at DESC;
