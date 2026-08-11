-- Phase 7: Add the properties.slug column (idempotent replacement for 06)
--
-- WHY: the application code (propertyRepository.create / findByIdOrSlug) reads and
-- writes properties.slug, but 06-add-property-slugs.sql was never applied to the
-- live Supabase project. Every listing create fails with:
--   ERROR 42703: column properties.slug does not exist
--
-- HOW TO RUN: paste this whole file into the Supabase SQL Editor and execute.
-- Safe to run more than once.

-- 1. Add the column if it is not already there (nullable during backfill)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS slug text;

-- 2. Backfill any row without a slug.
--    lower + collapse non-alphanumerics to single hyphens + trim leading/trailing
--    hyphens, then append the first 6 chars of the UUID to guarantee uniqueness.
UPDATE properties
SET slug = trim(both '-' from lower(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g')))
           || '-' || substr(id::text, 1, 6)
WHERE slug IS NULL OR slug = '';

-- 3. Enforce uniqueness and NOT NULL now that every row has a value
CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_slug ON properties(slug);

ALTER TABLE properties ALTER COLUMN slug SET NOT NULL;

-- 4. Verify: every row should have a distinct, non-null slug
SELECT id, title, slug FROM properties ORDER BY created_at DESC;
