# Phase 3: Data Migration Script

**Purpose:** Export data from MongoDB Atlas, transform it, and import into Supabase PostgreSQL.

**Safety:** This script is read-only on MongoDB and non-destructive — MongoDB data is never modified.

---

## Prerequisites

Before running the migration script:

1. ✓ **Supabase project created** — with all tables from `05-supabase-schema.sql` already created
2. ✓ **Credentials in `.env`**:
   ```
   SUPABASE_URL=https://...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```
3. ✓ **MongoDB Atlas still running** — current data source
4. ✓ **Local Node.js environment** — with `npm install` already run

---

## Running the Migration

### Option 1: Append mode (skip existing rows)
```bash
npm run migrate
```

**What it does:**
- Reads from MongoDB collections (non-destructive)
- Inserts into Supabase PostgreSQL
- Skips rows that already exist (idempotent-safe)
- Safe to run multiple times

**Use when:** You're doing an incremental migration or need to re-run on failure without losing previous progress.

---

### Option 2: Truncate mode (clear and re-import)
```bash
npm run migrate:truncate
```

**What it does:**
- Truncates all Supabase tables (clears existing data)
- Re-imports everything fresh from MongoDB
- Ensures clean state

**Use when:** You're starting from a clean slate or fixing a corrupted migration state.

---

## What the Script Does

1. **Migrates users** (no dependencies)
   - Converts `_id` (ObjectId) → UUID
   - All fields preserved exactly
   - Verifies row count matches MongoDB

2. **Migrates properties** (depends on users)
   - Flattens embedded `location` object
   - Normalizes embedded `images` array → separate table
   - Resolves `owner_id` FK to migrated user UUID
   - Generates `search_vector` automatically

3. **Migrates property images** (normalized child table)
   - Each image becomes a separate row
   - Preserves sort order for gallery display
   - Links back to property via FK

4. **Migrates reviews** (depends on properties + users)
   - Converts FK references to new UUIDs
   - User reference optional (anonymous reviews supported)

5. **Migrates comments** (depends on properties)
   - No user relationship (anonymous by design)
   - Preserves creator email & name

6. **Migrates notifications** (depends on users)
   - Metadata (JSON) preserved as JSONB
   - All notification types supported

### After Each Table:
- ✓ Logs number of rows inserted
- ✓ Verifies row count matches MongoDB
- ✓ Throws error if mismatch detected (stops migration)

### At the End:
- ✓ Generates `migration-id-map.csv` — Mongo ObjectId → Postgres UUID mapping
  - Useful for debugging or ID-based lookups
  - One row per migrated record

---

## ID Mapping CSV

**File:** `migration-id-map.csv` (auto-generated)

**Format:**
```
mongoId,postgresId,collection
"507f1f77bcf86cd799439011","550e8400-e29b-41d4-a716-446655440000","users"
"507f1f77bcf86cd799439012","550e8400-e29b-41d4-a716-446655440001","users"
...
```

**Use cases:**
- Verify that a specific Mongo ID was migrated to which UUID
- Generate redirect mappings if sharing old Mongo IDs in URLs
- Debug orphaned FK references

---

## Troubleshooting

### "Row count mismatch!"

**Cause:** Insertion stopped partway through, or a query is incorrect.

**Fix:**
1. Check Supabase SQL logs for any constraint violations
2. Review the table that failed (check for NULL FKs, duplicate unique keys)
3. Run with `--truncate` mode to clear and retry:
   ```bash
   npm run migrate:truncate
   ```

### "Owner [ObjectId] not found in user ID map"

**Cause:** A property references a user that wasn't migrated.

**Fix:**
1. Verify that user exists in MongoDB: `db.users.findOne({_id: ObjectId("[id]")})`
2. Check if MongoDB connection is stable
3. Clear Supabase and re-run full migration

### "Network timeout"

**Cause:** Supabase connection unstable or migration taking too long.

**Fix:**
1. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct
2. Check Supabase status page
3. Reduce batch size in script if needed (edit `BATCH_SIZE` constant)

### "PGRST116 (no rows returned)"

**Cause:** Trying to select a row that doesn't exist.

**Fix:** Usually safe to ignore in append mode. Run again to retry.

---

## Reverting the Migration

To undo a migration and start fresh:

1. **Clear Supabase tables** (via Supabase SQL Editor):
   ```sql
   DELETE FROM notifications;
   DELETE FROM comments;
   DELETE FROM reviews;
   DELETE FROM property_images;
   DELETE FROM properties;
   DELETE FROM users;
   ```

2. **Re-run migration**:
   ```bash
   npm run migrate:truncate
   ```

3. **Or just run it again** (idempotent):
   ```bash
   npm run migrate
   ```

---

## Performance Notes

- **Speed:** ~5-10 seconds for typical dataset (< 1000 properties)
- **Row batching:** Uses 1000-row batches for efficiency (Supabase limit is higher, but safer)
- **Memory:** Minimal — streams data, doesn't load entire collections into RAM
- **Downtime:** Not required — can run anytime (MongoDB stays live, Supabase is write-isolated)

---

## Next Steps (Phase 4)

Once migration succeeds:

1. ✓ Local testing: Update `authController` to use `userRepository` instead of `User` model
2. ✓ Test login/register flows
3. ✓ Incrementally migrate other controllers (propertyController, reviewController, etc.)
4. ✓ Deploy to production

See `../../docs/migration/02-migration-report.md` Phase 4 section for module cutover order.

---

## Questions?

- **Schema mismatch?** Check `../../docs/migration/03-model-to-table-mapping.md`
- **Data integrity?** Check `../../docs/migration/01-architecture-audit.md`
- **Overall plan?** Check `../../docs/migration/02-migration-report.md`
