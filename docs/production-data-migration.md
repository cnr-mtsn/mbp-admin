# Production Data Migration Guide

This guide walks you through migrating your production billing data from your local database to the Render production database.

## Data to Migrate

Your local database contains:
- **78 customers** - Customer contact information
- **44 services** - Painting services catalog
- **15 jobs** - Active/completed painting jobs
- **119 invoices** - Invoice records with payment information
- **0 estimates** - No estimates data

**Total**: 256 records across 5 tables

## Prerequisites

✅ Render database exists (`paint-inventory-db`)
✅ Tables created on Render (run `migrate-render-db.js` first)
✅ Backend deployed to Render
✅ You have the Render database connection string

## Migration Methods

Choose **ONE** of these methods:

### Method 1: Using Render Shell (Recommended - Easiest)

This method uploads the SQL file and runs the import directly on Render.

#### Step 1: Prepare the Export File

The export is already created at:
```
/Users/cnrmtsn/Development/matson-bros/backend/data-export-production.sql
```

#### Step 2: Upload to Render

You'll need to get the SQL file onto Render. Options:

**Option A: Push to Git (Simplest)**
```bash
cd /Users/cnrmtsn/Development/matson-bros
git add backend/data-export-production.sql
git add backend/scripts/import-production-data.js
git commit -m "Add production data export and import script"
git push origin main
```

Then trigger a redeploy on Render Dashboard → `paint-inventory-api` → "Manual Deploy"

**Option B: Use Render Disk (if you have persistent disk)**
- Upload via SFTP or scp to Render disk

#### Step 3: Run Import in Render Shell

1. Go to Render Dashboard → `paint-inventory-api`
2. Click "Shell" in the left sidebar
3. Run the import:

```bash
node scripts/import-production-data.js
```

#### Step 4: Verify

Check the output - you should see:
```
✓ Data import completed successfully
📊 Updated data in Render database:
  customers: 78 rows (+78 new)
  services: 44 rows (+44 new)
  jobs: 15 rows (+15 new)
  invoices: 119 rows (+119 new)
```

---

### Method 2: Direct psql Import from Local Machine

This method connects directly from your local machine to the Render database.

#### Step 1: Get Render Database URL

1. Go to Render Dashboard → Your database (`paint-inventory-db`)
2. Copy the **"External Database URL"**
   - Format: `postgres://user:password@host.render.com:5432/dbname`

#### Step 2: Run Migration Script Locally

```bash
cd /Users/cnrmtsn/Development/matson-bros/backend
export DATABASE_URL="your-render-database-url-here"
node scripts/import-production-data.js
```

**OR** use psql directly:

```bash
psql "your-render-database-url-here" < data-export-production.sql
```

#### Step 3: Verify Import

```bash
# Connect to Render database
psql "your-render-database-url-here"

# Check counts
SELECT 'customers' as table_name, COUNT(*) FROM customers
UNION ALL
SELECT 'services', COUNT(*) FROM services
UNION ALL
SELECT 'jobs', COUNT(*) FROM jobs
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices;
```

---

## Troubleshooting

### Error: "duplicate key value violates unique constraint"

**Cause**: Data already exists in the database.

**Solution**:
1. Check if data is already present:
   ```sql
   SELECT COUNT(*) FROM customers;
   SELECT COUNT(*) FROM invoices;
   ```

2. If data exists and you want to replace it:
   ```sql
   -- CAREFUL: This deletes all data!
   TRUNCATE TABLE invoices CASCADE;
   TRUNCATE TABLE jobs CASCADE;
   TRUNCATE TABLE estimates CASCADE;
   TRUNCATE TABLE services CASCADE;
   TRUNCATE TABLE customers CASCADE;
   ```

3. Re-run the import

### Error: "relation does not exist"

**Cause**: Tables haven't been created yet.

**Solution**: Run the migration script first:
```bash
node scripts/migrate-render-db.js
```

### Error: "could not connect to server"

**Cause**: Wrong DATABASE_URL or network issue.

**Solution**:
1. Verify the database URL is correct
2. Check that external connections are allowed (should be by default on Render)
3. Try the "Internal Database URL" if backend and DB are in same region

### Foreign Key Constraint Errors

**Cause**: Data being imported references IDs that don't exist.

**Solution**: The export script uses `--inserts` which maintains the correct order. If you still get errors:

1. Import in this order:
   - customers (no dependencies)
   - services (no dependencies)
   - estimates (depends on customers)
   - jobs (depends on customers + estimates)
   - invoices (depends on customers + jobs + estimates)

2. Or temporarily disable foreign key checks:
   ```sql
   SET session_replication_role = 'replica';
   -- run import
   SET session_replication_role = 'origin';
   ```

---

## Verification Checklist

After import, verify the following:

### 1. Data Counts Match
```sql
SELECT 'customers' as table_name, COUNT(*) as count FROM customers
UNION ALL
SELECT 'services', COUNT(*) FROM services
UNION ALL
SELECT 'jobs', COUNT(*) FROM jobs
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices;
```

Expected:
- customers: 78
- services: 44
- jobs: 15
- invoices: 119

### 2. Sample Data Integrity

Check a few records look correct:
```sql
-- Check customer
SELECT * FROM customers LIMIT 5;

-- Check invoice with job relationship
SELECT i.id, i.invoice_number, c.name as customer_name, j.title as job_title
FROM invoices i
JOIN customers c ON i.customer_id = c.id
LEFT JOIN jobs j ON i.job_id = j.id
LIMIT 5;

-- Check services
SELECT * FROM services LIMIT 5;
```

### 3. Test in Billing App

1. Open your billing app: `https://billing-frontend.onrender.com`
2. Log in
3. Navigate to:
   - **Customers** - Should show 78 customers
   - **Invoices** - Should show 119 invoices
   - **Jobs** - Should show 15 jobs
   - **Services** - Should show 44 services
4. Open a customer detail page - should show their invoices
5. Open an invoice - should show line items with services

---

## Alternative: Re-export Without SQL File

If you prefer not to commit the SQL file to Git, you can pipe directly:

```bash
# Export and import in one command
pg_dump -U cnrmtsn -d matson_bros \
  --data-only --inserts \
  --table=customers \
  --table=services \
  --table=estimates \
  --table=jobs \
  --table=invoices \
  | psql "your-render-database-url"
```

---

## Rollback Plan

If something goes wrong and you need to rollback:

### Option 1: Truncate Tables (Clears All Data)
```sql
TRUNCATE TABLE invoices CASCADE;
TRUNCATE TABLE jobs CASCADE;
TRUNCATE TABLE estimates CASCADE;
TRUNCATE TABLE services CASCADE;
TRUNCATE TABLE customers CASCADE;
```

### Option 2: Drop and Recreate Tables
```bash
# In Render Shell
node scripts/migrate-render-db.js
```

This will recreate empty tables.

---

## Data Update Strategy (Future)

For ongoing updates (new customers, invoices, etc.), you have two options:

### Option 1: Create via Billing App UI
Best for normal operations. All new data should be created directly in production.

### Option 2: Incremental Exports
If you have local-only data to sync:

```bash
# Export only recent data
pg_dump -U cnrmtsn -d matson_bros \
  --data-only --inserts \
  --table=customers \
  --table=invoices \
  -W "created_at > '2025-12-08'" \
  > incremental-export.sql

# Import to Render
psql "render-db-url" < incremental-export.sql
```

---

## Security Notes

⚠️ **IMPORTANT**: The `data-export-production.sql` file contains:
- Customer names and contact information
- Email addresses and phone numbers
- Physical addresses
- Invoice amounts and payment data

**Best Practices**:
1. ✅ Add to `.gitignore` if sensitive (already done)
2. ✅ Delete from local machine after import
3. ✅ Use environment variables for database URLs
4. ❌ Never commit to public repositories
5. ❌ Never share in Slack/email

If you already pushed to GitHub and it contains sensitive data:
```bash
# Remove from git history
git rm backend/data-export-production.sql
git commit -m "Remove sensitive data file"
git push origin main
```

---

## Summary

**What you're migrating**: 256 records (customers, services, jobs, invoices)

**Recommended approach**: Method 1 (Render Shell)

**Time estimate**: 2-5 minutes

**Risk level**: Low (uses transactions, can rollback)

**Steps**:
1. Push export file and import script to Git
2. Redeploy backend on Render
3. Open Render Shell
4. Run `node scripts/import-production-data.js`
5. Verify in billing app

---

## Files Reference

- `backend/data-export-production.sql` - Your production data export (71KB)
- `backend/scripts/import-production-data.js` - Import script
- `backend/scripts/migrate-render-db.js` - Table creation script (run first)
- `docs/production-data-migration.md` - This guide

## Support

If you encounter issues during migration:
1. Check error messages carefully
2. Review troubleshooting section above
3. Verify tables exist before importing
4. Check database connection string is correct
5. Ensure you ran `migrate-render-db.js` first
