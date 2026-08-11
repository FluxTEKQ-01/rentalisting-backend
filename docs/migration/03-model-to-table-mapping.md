# Model-to-Table Mapping: MongoDB → PostgreSQL

**Date:** 2026-08-10  
**Purpose:** Detailed field-by-field transformation guide for data migration  
**Status:** Complete — ready for Phase 3 data migration script

---

## Overview

This document maps every MongoDB collection/Mongoose model to its Supabase PostgreSQL table equivalent, including field transformations, data type conversions, and special handling notes.

**Key principles:**
- All ObjectId fields → UUID
- Embedded arrays normalized → child tables
- Enum values preserved as enum types
- Timestamps and defaults replicated
- Indexes re-created for performance
- Foreign key constraints explicit (vs. implicit in Mongo)

---

## 1. USER → users table

### MongoDB Schema (Mongoose)
```javascript
{
  _id: ObjectId,
  name: String (2-100),
  email: String (unique),
  mobile: String (unique),
  password: String,
  role: Enum ['visitor', 'owner', 'admin'],
  avatar: String,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### PostgreSQL Table
```sql
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
```

### Field Mapping

| Mongo Field | PostgreSQL Column | Type Conversion | Notes |
|-------------|-------------------|-----------------|-------|
| _id | id | ObjectId → UUID | Use `gen_random_uuid()` on insert |
| name | name | String → VARCHAR(100) | CHECK constraint ≥2 chars (replaces Mongoose validation) |
| email | email | String → VARCHAR(255) | UNIQUE constraint (was Mongoose unique + Mongo index) |
| mobile | mobile | String → VARCHAR(20) | UNIQUE constraint |
| password | password_hash | String → TEXT | No change to hashing (bcryptjs hashing happens in app layer) |
| role | role | Enum → user_role enum type | 'visitor' \| 'owner' \| 'admin', default 'owner' |
| avatar | avatar | String → TEXT | default '' |
| isActive | is_active | Boolean → BOOLEAN | default true |
| createdAt | created_at | Date → TIMESTAMPTZ | Default now(), preserve original value during migration |
| updatedAt | updated_at | TIMESTAMPTZ | Auto-maintained by trigger; preserve original value during migration |

### Indexes
```sql
CREATE INDEX idx_users_role ON users(role);
```

### Additional Constraints
- UNIQUE on email (enforced at DB level, vs. Mongoose + Mongo implicit)
- UNIQUE on mobile
- UNIQUE on email or mobile violations will fail inserts (same as Mongo behavior)

### Migration Special Handling
- **Password:** Already hashed in Mongo (bcryptjs), migrate as-is to TEXT
- **Timestamps:** Preserve original `createdAt` and `updatedAt` values from Mongo (don't regenerate)
- **ID mapping:** Save Mongo `_id` (string) → new Postgres `id` (UUID) mapping to CSV for audit trail

---

## 2. PROPERTY → properties table + property_images child table

### MongoDB Schema (Mongoose)
```javascript
{
  _id: ObjectId,
  title: String (5-200),
  description: String (20+),
  propertyType: Enum (16 types),
  price: Number,
  maxPrice: Number (optional),
  currency: String,
  bedrooms: Number,
  bathrooms: Number,
  area: Number,
  maxArea: Number (optional),
  areaUnit: String,
  amenities: [String],
  images: [{url, publicId}],  // EMBEDDED ARRAY → NORMALIZED
  videoUrl: String,
  location: {               // EMBEDDED OBJECT → FLATTENED
    address: String,
    city: String,
    state: String,
    zipCode: String,
    coordinates: {lat, lng}
  },
  owner: ObjectId (ref User),
  status: Enum (7 states),
  feedback: String,
  feedbackProvidedAt: Date,
  reviewedBy: ObjectId (ref User, optional),
  reviewedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### PostgreSQL Tables

#### properties (main table)
```sql
CREATE TYPE property_type AS ENUM (
  'office', 'shop_retail', 'warehouse', 'house_apartment', 'apartment', 'villa',
  'open_plot_land', 'event_venue', 'coworking', 'commercial_building', 'parking',
  'showroom', 'industrial', 'hotel_banquet', 'shooting_location', 'storage'
);

CREATE TYPE property_status AS ENUM (
  'draft', 'submitted', 'pending_review', 'approved', 'rejected', 'published', 'archived'
);

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
    (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,''))) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### property_images (child table, normalized from Property.images[])
```sql
CREATE TABLE property_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  public_id TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_property_images_property ON property_images(property_id);
```

### Field Mapping

| Mongo Field | PostgreSQL Column(s) | Type Conversion | Notes |
|-------------|----------------------|-----------------|-------|
| _id | id | ObjectId → UUID | gen_random_uuid() |
| title | title | String → VARCHAR(200) | CHECK ≥5 chars |
| description | description | String → TEXT | CHECK ≥20 chars |
| propertyType | property_type | Enum (16 types) → property_type enum | Exact enum values preserved |
| price | price | Number → NUMERIC(12,2) | CHECK ≥0; allows decimals |
| maxPrice | max_price | Number → NUMERIC(12,2) | Optional; CHECK ≥0 |
| currency | currency | String → VARCHAR(3) | default 'INR' |
| bedrooms | bedrooms | Number → INT | default 0, CHECK ≥0 |
| bathrooms | bathrooms | Number → INT | default 0, CHECK ≥0 |
| area | area | Number → NUMERIC(12,2) | CHECK ≥0 |
| maxArea | max_area | Number → NUMERIC(12,2) | Optional; CHECK ≥0 |
| areaUnit | area_unit | String → VARCHAR(20) | default 'sqft' |
| amenities | amenities | [String] → TEXT[] | Array type in Postgres |
| images[].url | property_images.url | String → TEXT | Moved to child table |
| images[].publicId | property_images.public_id | String → TEXT | Moved to child table |
| videoUrl | video_url | String → TEXT | default '' |
| location.address | address | String → TEXT | default '' |
| location.city | city | String → VARCHAR(100) | required (no NULL) |
| location.state | state | String → VARCHAR(100) | default '' |
| location.zipCode | zip_code | String → VARCHAR(20) | default '' |
| location.coordinates.lat | lat | Number → DOUBLE PRECISION | default 0 |
| location.coordinates.lng | lng | Number → DOUBLE PRECISION | default 0 |
| owner | owner_id | ObjectId → UUID | FK to users.id, ON DELETE CASCADE |
| status | status | Enum (7 states) → property_status enum | default 'draft' |
| feedback | feedback | String → TEXT | default '' |
| feedbackProvidedAt | feedback_provided_at | Date → TIMESTAMPTZ | optional |
| reviewedBy | reviewed_by | ObjectId → UUID | FK to users.id, optional, ON DELETE SET NULL |
| reviewedAt | reviewed_at | Date → TIMESTAMPTZ | optional |
| **N/A** | search_vector | **Generated** | Postgres `tsvector` via trigger (replaces Mongo text index) |
| createdAt | created_at | Date → TIMESTAMPTZ | preserve original |
| updatedAt | updated_at | Date → TIMESTAMPTZ | preserve original + auto-trigger |

### Indexes
```sql
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_owner ON properties(owner_id);
CREATE INDEX idx_properties_city ON properties(city);
CREATE INDEX idx_properties_type ON properties(property_type);
CREATE INDEX idx_properties_price ON properties(price);
CREATE INDEX idx_properties_search ON properties USING gin(search_vector);
CREATE INDEX idx_property_images_property ON property_images(property_id);
```

### Migration Special Handling
- **Images array:** Each `{url, publicId}` object in `images[]` becomes one row in `property_images` with `property_id` FK + `sort_order` to preserve order
- **Location object:** Flattened; all null/empty fields in Mongo become default values in Postgres (no NULL columns)
- **Search vector:** Generated column (`to_tsvector('english', title || description)`). Automatically maintained on INSERT/UPDATE. No manual migration needed; Postgres generates it on first SELECT
- **Coordinates:** lat/lng become simple DOUBLE PRECISION columns (no spatial indexing needed for now, simple equality filters only)

---

## 3. REVIEW → reviews table

### MongoDB Schema
```javascript
{
  _id: ObjectId,
  property: ObjectId (ref Property),
  user: ObjectId (ref User, optional),
  userName: String,
  rating: Number (1-5),
  comment: String,
  isApproved: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### PostgreSQL Table
```sql
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
```

### Field Mapping

| Mongo Field | PostgreSQL Column | Type Conversion | Notes |
|-------------|-------------------|-----------------|-------|
| _id | id | ObjectId → UUID | gen_random_uuid() |
| property | property_id | ObjectId → UUID | FK to properties.id, ON DELETE CASCADE (delete review when property deleted) |
| user | user_id | ObjectId → UUID | FK to users.id, optional, ON DELETE SET NULL |
| userName | user_name | String → VARCHAR(150) | default 'Verified Visitor' |
| rating | rating | Number → INT | CHECK 1-5 (enforced at DB vs. Mongoose validation) |
| comment | comment | String → TEXT | required, no NULL |
| isApproved | is_approved | Boolean → BOOLEAN | default true |
| createdAt | created_at | Date → TIMESTAMPTZ | preserve original |
| updatedAt | updated_at | Date → TIMESTAMPTZ | preserve original + auto-trigger |

### Indexes
```sql
CREATE INDEX idx_reviews_property ON reviews(property_id);
```

### Migration Special Handling
- None. Straightforward 1:1 mapping.

---

## 4. COMMENT → comments table

### MongoDB Schema
```javascript
{
  _id: ObjectId,
  propertyId: ObjectId (ref Property),
  name: String,
  email: String,
  address: String (optional),
  comment: String,
  createdAt: Date
}
```

### PostgreSQL Table
```sql
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
```

### Field Mapping

| Mongo Field | PostgreSQL Column | Type Conversion | Notes |
|-------------|-------------------|-----------------|-------|
| _id | id | ObjectId → UUID | gen_random_uuid() |
| propertyId | property_id | ObjectId → UUID | FK to properties.id, ON DELETE CASCADE |
| name | name | String → VARCHAR(150) | required |
| email | email | String → VARCHAR(255) | required |
| address | address | String → TEXT | optional, default '' |
| comment | comment | String → TEXT | required |
| createdAt | created_at | Date → TIMESTAMPTZ | preserve original (NO updatedAt in Postgres) |

### Indexes
```sql
CREATE INDEX idx_comments_property_created ON comments(property_id, created_at DESC);
```

### Migration Special Handling
- No `updatedAt` column in Postgres (not in Mongoose either). Only `created_at`.

---

## 5. NOTIFICATION → notifications table

### MongoDB Schema
```javascript
{
  _id: ObjectId,
  recipient: ObjectId (ref User),
  type: Enum (9 types),
  title: String,
  message: String,
  metadata: Mixed (JSON),
  isRead: Boolean,
  createdAt: Date
}
```

### PostgreSQL Table
```sql
CREATE TYPE notification_type AS ENUM (
  'listing_submitted', 'listing_approved', 'listing_rejected', 'listing_resubmitted',
  'feedback_available', 'listing_published', 'new_submission', 'new_review', 'inquiry'
);

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
```

### Field Mapping

| Mongo Field | PostgreSQL Column | Type Conversion | Notes |
|-------------|-------------------|-----------------|-------|
| _id | id | ObjectId → UUID | gen_random_uuid() |
| recipient | recipient_id | ObjectId → UUID | FK to users.id, ON DELETE CASCADE |
| type | type | Enum (9 types) → notification_type enum | Exact enum values preserved |
| title | title | String → VARCHAR(255) | required |
| message | message | String → TEXT | required |
| metadata | metadata | Mixed/JSON → JSONB | Flexible JSON, default '{}' (empty object) |
| isRead | is_read | Boolean → BOOLEAN | default false |
| createdAt | created_at | Date → TIMESTAMPTZ | preserve original (NO updatedAt) |

### Indexes
```sql
CREATE INDEX idx_notifications_recipient_created ON notifications(recipient_id, created_at DESC);
CREATE INDEX idx_notifications_recipient_unread ON notifications(recipient_id, is_read);
```

### Migration Special Handling
- **metadata field:** Migrate as JSONB (Postgres's native JSON type). Mongoose Mixed type becomes arbitrary JSON structure, preserved 1:1.
- No `updatedAt` column.

---

## 6. NEW: property_status_history table (audit trail)

**Not from Mongo — new table for admin workflow auditing.**

### PostgreSQL Table
```sql
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
```

### Purpose
Tracks every status change (draft → submitted → pending_review → approved, etc.) with:
- Who made the change (admin)
- Feedback (if rejection)
- Timestamp
- Original and new status

### When to populate
- Phase 4: Before enabling this table, insert historical status changes from `Property.status` + `Property.reviewedBy` + `Property.reviewedAt` + `Property.feedback` (but only if `status` is one of the final states — 'approved', 'rejected', 'published', 'archived')
- Going forward: Every `adminController` call to approve/reject/archive creates a new row in this table

### Not required for MVP
This table is optional for the initial migration. Properties table is sufficient. If admin audit trails are needed, populate this table during Phase 4 with historical data, then auto-populate on future status changes.

---

## 7. NEW: refresh_tokens table (optional, for token revocation)

**Not from Mongo — new capability for stateful token management.**

### PostgreSQL Table
```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
```

### Purpose
Optional enhancement for token lifecycle management:
- Revoke token on logout
- Rotate tokens (old token invalidated when refresh is called)
- Session management (list active tokens for a user)

### Current behavior (stateless JWT)
Today, refresh tokens are self-contained JWTs with no DB lookup. This table is **not required** for the migration. The app works fine without it.

### If added in Phase 2+
- `authController.refresh()` checks if token exists + not revoked before issuing new access token
- `authController.logout()` (if implemented) marks token as revoked
- `authController.sessions()` (if implemented) lists active tokens

### For MVP migration
**Do not populate this table during Phase 3.** Keep it as schema-only. If token revocation is desired, implement the feature in Phase 2+. Existing users won't have rows here — that's fine.

---

## Open Question: enquiries table

### Context
No Mongoose `Enquiry` model exists. `contactPropertyOwner` endpoint only logs inquiries to console; nothing is persisted. The `enquiries` table mentioned in earlier planning docs is aspirational, not a data port.

### Options

**Option A: Do not create enquiries table (stay out of scope)**
- `contactPropertyOwner` continues to log only
- No data migration needed
- No new feature added

**Option B: Create enquiries table, populate with new inquiries going forward**
```sql
CREATE TABLE enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
- No historical data to migrate (none exists)
- Start capturing inquiries from Phase 4 onward
- `contactPropertyOwner` inserts into this table instead of only logging

### Recommendation
**Option A** for MVP (keep out of scope, focus on core migration). If inquiries need to be persisted, it's a Phase 2+ feature, not a data migration.

---

## Migration Sequence

**Phase 3 data import order (respects FK dependencies):**

1. `users` — no dependencies
2. `properties` — FK to users (owner_id)
3. `property_images` — FK to properties
4. `reviews` — FK to properties + users
5. `comments` — FK to properties
6. `notifications` — FK to users

**Do NOT import:**
- `refresh_tokens` — empty in migration, populate on-demand in Phase 2+
- `property_status_history` — empty in migration, populate on-demand in Phase 4+ for audit trail
- `enquiries` — not in scope (stay log-only unless Phase 2+ feature decision)

---

## Verification Checklist

After Phase 3 data import, verify:

- [ ] Row counts match Mongo collections exactly (users, properties, reviews, comments, notifications)
- [ ] Property images: sum of `property_images` rows = total images across all properties in Mongo
- [ ] No orphaned property_images (all property_id FK refs exist in properties)
- [ ] No orphaned reviews (all property_id, user_id FK refs exist)
- [ ] No orphaned comments (all property_id FK refs exist)
- [ ] No orphaned notifications (all recipient_id FK refs exist)
- [ ] Sample queries work (list properties, get reviews, search by city, etc.)
- [ ] Timestamps are within 1 second of Mongo originals
- [ ] Enums preserved correctly (no mismatched status values, property types, roles, etc.)
- [ ] Text search vector populated (TSVECTOR generated automatically, test search works)
- [ ] Unique constraints work (email, mobile unique violations caught)
- [ ] FK cascade works (delete a property → images/reviews/comments auto-deleted)

---

## Migration Script Pseudocode

```typescript
// Phase 3: rentalisting-backend/scripts/migrate-to-supabase.ts (outline)

async function migrate() {
  // 1. Connect to Mongo (read-only)
  // 2. Connect to Supabase (write)
  
  // 3. Clear target tables (TRUNCATE with cascades)
  
  // 4. Migrate users
  const userIdMap = new Map(); // Mongo ObjectId (string) → Postgres UUID
  for (const mongoUser of mongoUsers) {
    const postgresUser = {
      id: uuid.v4(),
      name: mongoUser.name,
      email: mongoUser.email,
      mobile: mongoUser.mobile,
      password_hash: mongoUser.password,
      role: mongoUser.role,
      avatar: mongoUser.avatar || '',
      is_active: mongoUser.isActive,
      created_at: mongoUser.createdAt,
      updated_at: mongoUser.updatedAt
    };
    const inserted = await supabase.from('users').insert(postgresUser);
    userIdMap.set(mongoUser._id.toString(), postgresUser.id);
  }
  verifyRowCount('users', mongoUsers.length);
  
  // 5. Migrate properties + images (together, since FK)
  const propertyIdMap = new Map();
  for (const mongoProperty of mongoProperties) {
    const postgresProperty = {
      id: uuid.v4(),
      title: mongoProperty.title,
      description: mongoProperty.description,
      property_type: mongoProperty.propertyType,
      price: mongoProperty.price,
      // ... all other fields ...
      owner_id: userIdMap.get(mongoProperty.owner.toString()),
      created_at: mongoProperty.createdAt,
      updated_at: mongoProperty.updatedAt
    };
    await supabase.from('properties').insert(postgresProperty);
    propertyIdMap.set(mongoProperty._id.toString(), postgresProperty.id);
    
    // Insert images as separate rows
    for (const [index, image] of mongoProperty.images.entries()) {
      await supabase.from('property_images').insert({
        property_id: postgresProperty.id,
        url: image.url,
        public_id: image.publicId,
        sort_order: index
      });
    }
  }
  verifyRowCount('properties', mongoProperties.length);
  
  // 6. Migrate reviews
  for (const mongoReview of mongoReviews) {
    const postgresReview = {
      id: uuid.v4(),
      property_id: propertyIdMap.get(mongoReview.property.toString()),
      user_id: mongoReview.user ? userIdMap.get(mongoReview.user.toString()) : null,
      user_name: mongoReview.userName,
      rating: mongoReview.rating,
      comment: mongoReview.comment,
      is_approved: mongoReview.isApproved,
      created_at: mongoReview.createdAt,
      updated_at: mongoReview.updatedAt
    };
    await supabase.from('reviews').insert(postgresReview);
  }
  verifyRowCount('reviews', mongoReviews.length);
  
  // 7. Similar for comments, notifications...
  // 8. Save ID-mapping CSV for audit trail
  // 9. Print summary + any errors
}
```

---

## Summary

All five Mongoose models map cleanly to five Postgres tables plus three new optional tables. No complex transformations. The migration is straightforward data transformation (ObjectId→UUID, embedded arrays→normalized, enums preserved) with full rollback capability until Phase 5.

Ready for Phase 3 scripting.
