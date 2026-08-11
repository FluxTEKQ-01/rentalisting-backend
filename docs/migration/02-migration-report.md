# Migration Report: MongoDB Atlas → Supabase PostgreSQL

**Date:** 2026-08-10  
**Project:** BookMySpace Backend  
**Report Type:** Pre-migration risk assessment and strategy  
**Status:** Complete

---

## Executive Summary

This report outlines the migration from MongoDB Atlas (via Mongoose) to Supabase PostgreSQL. The migration is **low-risk** because:
1. The codebase is well-structured, with clear model-controller separation.
2. No complex aggregation pipelines or custom Mongo features are used.
3. All 8 controllers follow simple CRUD patterns + filtering/search.
4. The API surface is stable and will not change (by design).
5. A repository-pattern abstraction will keep controllers DB-agnostic.

**Estimated effort:** 60–80 engineering hours across 5 phases (audit, wiring, data migration, cutover, cleanup).

**Timeline:** 2–3 weeks with thorough testing.

**Rollback safety:** Mongo remains fully intact and connected through Phase 4, offering 100% rollback capability at any point.

---

## Current Architecture

```
┌─────────────────────────────────────────────┐
│          Express Routes + Controllers        │
│  (propertyController, authController, etc)  │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│         Mongoose Models (ODM)               │
│  User, Property, Review, Notification,      │
│  Comment (5 models total)                   │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│      MongoDB Atlas (current live DB)        │
│  - 5 collections                            │
│  - Embedded arrays (Property.images, ..)    │
│  - Text indexes on title+description        │
└─────────────────────────────────────────────┘
```

**Current state:**
- **Language:** Node.js + Express, TypeScript
- **ORM:** Mongoose 8.9.5
- **Database:** MongoDB Atlas (cloud-hosted)
- **Collections:** users, properties, reviews, notifications, comments (5 total)
- **Features:** Full-text search (Mongo text index), geolocation (lat/lng coordinates), relational references (MongoDB ObjectIds), role-based access
- **External services:** Cloudinary (images), JWT (stateless auth)

**Data characteristics:**
- Embedded arrays (`Property.images[]`, `Property.location{}`)
- Automatic timestamps (`createdAt`, `updatedAt`)
- Enum fields (property status, user roles, notification types)
- Text search on property title + description
- Indexing on: role, price, owner, city, propertyType, status
- Foreign key references via ObjectId (implicit, not enforced at DB level)

---

## Target Architecture

```
┌──────────────────────────────────────────────┐
│      Express Routes + Controllers             │
│  (unchanged API surface)                      │
└──────────────────┬───────────────────────────┘
                   │
┌──────────────────▼───────────────────────────┐
│     Repository Pattern Abstraction            │
│  userRepository, propertyRepository,          │
│  reviewRepository, notificationRepository,    │
│  commentRepository (5 repos)                  │
└──────────────────┬───────────────────────────┘
                   │
┌──────────────────▼───────────────────────────┐
│   Supabase Client (@supabase/supabase-js)    │
│   Service-role authentication                 │
└──────────────────┬───────────────────────────┘
                   │
┌──────────────────▼───────────────────────────┐
│  Supabase PostgreSQL (target live DB)        │
│  - 8 tables (5 ported + 3 new)               │
│  - Normalized structure (no embedded arrays) │
│  - tsvector + GIN index (FTS)                │
│  - UUID primary keys                         │
│  - Explicit foreign keys + cascades          │
└──────────────────────────────────────────────┘
```

**Target state:**
- **Language:** Same (Node.js + Express, TypeScript)
- **ORM:** Supabase client (PostgREST + direct SQL)
- **Database:** Supabase PostgreSQL
- **Tables:** users, properties, property_images, reviews, comments, notifications, refresh_tokens (new), property_status_history (new)
- **Features:** Full-text search (tsvector), geolocation (same), relational references (explicit PKs + FKs), role-based access
- **External services:** Cloudinary (images, unchanged), JWT (stateless auth, unchanged, with optional DB-backed revocation)

---

## Detailed Migration Scope

### Tables to Migrate (5)
1. **users** — Mongoose User model
2. **properties** — Mongoose Property model (images array → normalized child table)
3. **reviews** — Mongoose Review model
4. **comments** — Mongoose Comment model
5. **notifications** — Mongoose Notification model

### New Tables (3)
1. **property_images** — normalized from `Property.images[]` embedded array
2. **refresh_tokens** — NEW capability (stateless JWT → optional DB-backed token management)
3. **property_status_history** — audit trail for admin approve/reject workflow

### Tables NOT Created (Explicitly Out of Scope)
1. **enquiries** — No source data (see 01-architecture-audit.md). `contactPropertyOwner` currently logs only. If needed, add in Phase 2+ as a separate feature, not a data migration.

---

## Key Architecture Changes

| Aspect | MongoDB | Supabase PostgreSQL | Impact | Notes |
|--------|---------|-------------------|--------|-------|
| **ID Format** | ObjectId (12-byte, hex string in JSON) | UUID (16-byte, 36-char string with hyphens) | Medium | IDs won't match old UUIDs. ID-mapping table generated for audit. Frontend doesn't care (opaque). |
| **Embedded Arrays** | `Property.images[]`, `Property.location{}` | `property_images` child table, flat columns | Low | 1:N relationship normalized. No API change (controller still returns same shape). |
| **Text Search** | Mongo text index (language-aware stemming) | PostgreSQL `tsvector` + GIN index | Low | Same functionality, same search results (English language). |
| **Geolocation** | `coordinates{lat, lng}` | `lat`, `lng` columns (NUMERIC) | None | Identical behavior. Same queries. |
| **Timestamps** | Mongoose auto-`createdAt`/`updatedAt` | PostgreSQL defaults + trigger | Low | Functional equivalence. Frontend unchanged. |
| **Enums** | Mongoose enum strings (validated at app layer) | PostgreSQL enum types (validated at DB layer) | Very Low | Stronger schema enforcement. API responses identical. |
| **Foreign Keys** | Mongoose `.ref()` (implicit, not enforced) | Explicit FK constraints + cascades | Very Low | Better data integrity. API unchanged. |
| **Refresh Token Persistence** | Stateless JWT (no revocation, no DB) | Optional: `refresh_tokens` table | Low | NEW feature, not required. App works without it. Can add in Phase 2+. |
| **Admin Audit Trail** | Only in console logs (lost) | `property_status_history` table | Low | NEW feature, tracks approve/reject events. Frontend unaffected. |

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| **ID format mismatch** | High | Medium | Repository layer abstracts IDs. Frontend passes IDs as strings (opaque). ID-mapping CSV generated during data import. One-time data validation step. |
| **Data loss during migration** | Low | Critical | Pre-migration backups (Mongo + export CSVs). Row-count verification after each table import. Rollback: keep Mongo live through Phase 4. |
| **UUID/ObjectId serialization bugs** | Medium | High | Thorough testing per module in Phase 4. Controllers don't change, only repos. Quick revert if needed (switch one import line). |
| **Text search behavior divergence** | Low | Low | PostgreSQL `tsvector` (English) ≈ Mongo text index. Test search results on ~20 common queries before cutover. |
| **Foreign key cascade issues** | Low | High | Schema DDL carefully designed. Test data integrity with large datasets (simulated in test DB). Truncate `property_images` before `properties` if needed (FK cascade handles this). |
| **Timestamp inconsistencies** | Very Low | Low | Postgres triggers auto-update `updated_at`. Verify timestamps are within 1 second of Mongo originals. |
| **Controller regression** | Medium | High | Phase 4 incremental testing: hit every endpoint before moving to next module. All 8 controllers touch no DB code (repos are the change), so one-line reverts work. |
| **Permissions/RBAC breakage** | Low | Low | JWT auth flow unchanged. Middleware unchanged. Roles field migrated 1:1. No code changes to auth. |
| **Cloudinary integration issues** | Very Low | Very Low | Cloudinary URLs stored in Postgres exactly as Mongo. No Cloudinary code changes. Image upload unchanged. |

---

## Migration Order (Phases)

### Phase 1 ✓ (Current)
- Architecture audit (this document + 01-architecture-audit.md)
- PostgreSQL schema design (05-supabase-schema.sql)
- Credential cleanup (redact secrets, flag manual rotations)

### Phase 2
- `config/supabase.ts` — Supabase client initialization
- `src/repositories/*.ts` — 5 repository classes (userRepository, propertyRepository, reviewRepository, notificationRepository, commentRepository)
- Update `config/env.ts` to validate `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- **No controller changes.** Repos are additive; Mongoose models stay in place.
- **Verification:** `npm run build` succeeds. `npm run dev` starts with zero behavior change.

### Phase 3
- Data migration script: `scripts/migrate-to-supabase.ts`
- Export all Mongo collections → transform (ObjectId→UUID, arrays→normalization) → insert into Supabase PostgreSQL
- Verify row counts per table
- Generate ID-mapping CSV (Mongo ObjectId → Postgres UUID)
- **Verification:** Row counts match. No orphaned foreign keys. Sample queries return identical data shapes.

### Phase 4
- Incremental cutover, module by module (6 modules):
  1. Users + Auth (`authController` → `userRepository`)
  2. Properties (`propertyController` → `propertyRepository` + `propertyImageRepository`)
  3. Reviews (`reviewController` → `reviewRepository`)
  4. Comments (`commentController` → `commentRepository`)
  5. Notifications (`notificationController` → `notificationRepository`)
  6. Admin (`adminController` → relevant repositories)
- After each module: manual testing (curl/Postman or live frontend), compare responses to Mongo baseline
- Mongo stays connected, can revert by changing one import per controller if needed
- **Verification:** All endpoints return identical shapes, status codes, and data.

### Phase 5
- Remove Mongoose: delete `src/models/*.ts`, Mongo connection logic, `mongoose` npm dependency, `MONGODB_URI` from env and Render dashboard
- Decide: keep `src/repositories` abstraction (clean controllers) or remove it (controllers call Supabase directly)
- Grep `src/` for any remaining `mongoose`/`ObjectId` references, remove if found
- **Verification:** App runs without Mongoose. No errors. Frontend continues to work.

---

## Rollback Plan

### At any point before Phase 5 completion:
1. **Stop the cutover.** Revert controller imports back to Mongoose models (one line per controller).
2. **Reconnect to Mongo.** Verify backend reconnects to MongoDB Atlas without error.
3. **Test endpoints.** Hit a few endpoints, confirm data returns from Mongo.
4. **Zero data loss.** Mongo was never touched, never truncated, always available as the source of truth.

### Partial rollback (e.g., Users + Auth migrated, Properties still on Mongo):
1. Revert just `authController` to use `User` model directly.
2. `propertyController` stays on `propertyRepository` (Supabase).
3. App continues working with mixed backend (some tables in Postgres, some in Mongo).
4. Continue migration of Properties whenever ready, or abandon and stay on Mongo for that module.

### Post-Phase-5 rollback (after Mongoose removed):
1. Restore `src/models/*.ts`, Mongoose connection code from git history (`git checkout HEAD~1 -- src/models/`).
2. Reinstall `mongoose` npm dependency.
3. Update `MONGODB_URI` env var and Render dashboard.
4. Restart backend.
5. Data on Supabase is not touched, archived as a cold backup if needed.

**Estimated rollback time:** < 15 minutes for any partial rollback; < 1 hour for full rollback post-Phase-5 (git restore + npm install + restart).

---

## Estimated Code Changes

| Phase | Files Created | Files Modified | Lines Added | Lines Removed | Effort |
|-------|---------------|----------------|-------------|---------------|--------|
| 1 | 6 docs + 1 DDL | 5 (redaction) | ~2000 (docs) | 0 | 4 hours |
| 2 | supabase.ts + 5 repos | 1 (env.ts) | ~800 | 0 | 16 hours |
| 3 | migrate.ts script | 0 | ~600 | 0 | 12 hours |
| 4 | 0 | 6 controllers | ~200 | 0 | 24 hours |
| 5 | 0 | 3 deletions (models, db.ts, pkg.json) | 0 | ~1200 | 8 hours |
| **Total** | **12** | **16** | **~3600** | **~1200** | **64 hours** |

---

## Testing Checklist (for Phase 4)

- [ ] **Auth Module**
  - [ ] Register new user (POST /api/auth/register)
  - [ ] Login returns correct JWT shape
  - [ ] Refresh token endpoint works
  - [ ] Profile endpoint returns user from Supabase (not Mongo)
  - [ ] Invalid password rejected
  - [ ] Duplicate email rejected

- [ ] **Properties Module**
  - [ ] List properties with pagination (GET /api/properties?page=1&limit=10)
  - [ ] Filter by city, type, price range
  - [ ] Sort by price, date
  - [ ] Full-text search (title+description)
  - [ ] Get property detail (includes owner, reviews, comments)
  - [ ] Create property (POST, checks owner FK valid)
  - [ ] Update property
  - [ ] Submit for review
  - [ ] Resubmit after rejection
  - [ ] Delete property (checks cascade deletes images)
  - [ ] Contact owner form (logs inquiry, doesn't persist)

- [ ] **Reviews Module**
  - [ ] List reviews by property
  - [ ] Create review (checks property FK valid)
  - [ ] Update review (author only)
  - [ ] Delete review

- [ ] **Comments Module**
  - [ ] List comments by property
  - [ ] Create comment (no auth required)

- [ ] **Notifications Module**
  - [ ] List user's notifications
  - [ ] Mark as read
  - [ ] Mark all as read

- [ ] **Admin Module**
  - [ ] Dashboard stats (user count, property count, etc.)
  - [ ] Approve property (checks admin role, sets reviewedBy/reviewedAt)
  - [ ] Reject property (stores feedback)
  - [ ] Archive property
  - [ ] List users
  - [ ] Toggle user active/inactive
  - [ ] Delete user
  - [ ] List reviews

- [ ] **Data Integrity**
  - [ ] No orphaned property rows without owner_id
  - [ ] No orphaned reviews/comments without property_id
  - [ ] No orphaned notifications without recipient_id
  - [ ] Foreign key cascades work (delete property → delete images + reviews + comments)
  - [ ] Unique constraints on email, mobile
  - [ ] Check constraints on rating (1-5), area (≥0), price (≥0)

- [ ] **Performance**
  - [ ] List endpoint < 500 ms
  - [ ] Search endpoint < 1000 ms
  - [ ] Create property < 200 ms
  - [ ] Admin dashboard < 500 ms

---

## Notes for Phase 2+ Planning

1. **ID serialization:** Controllers will never directly compare old Mongo ObjectIds to new UUIDs. The repository layer handles all ID transformation. Frontend sees opaque ID strings — no change needed.

2. **Stateless JWT + optional `refresh_tokens` table:** The app works fine without DB-backed token revocation. If token rotation/revocation is desired, it's a Phase 2+ feature, not a strict port requirement.

3. **Enquiries scoping:** Decide in Phase 2 whether to persist inquiries going forward. Currently logs only. If persisting, add `enquiries` table in Phase 3. If staying log-only, remove `enquiries` from scope.

4. **Text search:** PostgreSQL `tsvector` (English language, stemming) ≈ Mongo text index. Results should be functionally identical. Worth testing ~20 real search queries before production cutover.

5. **Geolocation:** No spatial queries (ST_DISTANCE, etc.) are used today. Simple lat/lng equality filters won't use indexes efficiently in Postgres (might want trigram or spatial index later, but not critical for MVP).

6. **Error handling:** Repository layer will catch Postgres errors (unique violation, FK violation, etc.) and re-throw with identical error messages/codes so controllers need zero changes.

---

## Post-Migration (Phase 5+)

Once Phase 5 is complete and MongoDB is fully decommissioned:

1. **Supabase tuning:** Run `ANALYZE` on all tables, review slow query log, add indexes if needed.
2. **Monitoring:** Set up alerts for database connection errors, query timeout, slow queries.
3. **Backup strategy:** Enable Supabase automated backups (available in Pro+ tier).
4. **Documentation:** Update internal wiki with new DB connection string, backup procedures, disaster recovery steps.
5. **Team training:** Brief backend team on Supabase query patterns (PostgREST or direct SQL via client).
6. **Archive old resources:** Archive MongoDB Atlas project (don't delete for 30+ days as cold backup).

---

## Success Criteria

- ✓ All 5 tables successfully imported with 100% row count match
- ✓ All API endpoints return identical shapes and status codes (frontend never knows the difference)
- ✓ Full-text search produces results matching Mongo baseline
- ✓ Foreign key constraints enforced at DB layer
- ✓ Admin workflows (approve/reject/archive) function identically
- ✓ No Mongo-specific code remains in `src/`
- ✓ Frontend works without any changes
- ✓ Performance comparable or better than Mongo (expected: similar, maybe 5–10% faster due to Postgres optimization)

---

## Conclusion

This is a **well-scoped, low-risk migration** with clear phases, rollback safety at every step, and zero risk to the frontend. The architecture is clean, the codebase is well-organized, and the absence of complex Mongo features (aggregation, transactions, etc.) makes the move straightforward.

**Proceed to Phase 2 only after Phase 1 review is approved.**
