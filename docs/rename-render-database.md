# Renaming Render Database from paint_inventory to matson_bros

This guide explains how to create a new database on Render with the name `matson_bros` and migrate all data.

## ⚠️ WARNING

**You probably don't need to do this!** The database name is just a label and doesn't affect functionality. Your apps will work fine with the database named `paint_inventory`.

**Only proceed if you really want the database named `matson_bros`.**

## Current State

- Database name: `paint_inventory`
- External URL: `postgresql://paint_user:hDcrAmN4omkWFk7whYROZkd7Ejby0zrE@dpg-d4blo94hg0os73f1l8og-a.oregon-postgres.render.com/paint_inventory`
- Contains: Inventory app data (products, transactions, users)

## Process Overview

1. Create new database named `matson_bros` on Render
2. Export all data from `paint_inventory`
3. Import all data to `matson_bros`
4. Update all service environment variables
5. Test both apps
6. Delete old `paint_inventory` database

---

## Step 1: Create New Database on Render

1. Go to https://dashboard.render.com
2. Click "New" → "PostgreSQL"
3. Configure:
   - **Name**: `matson-bros-db`
   - **Database**: `matson_bros` (this is the actual database name)
   - **User**: `matson_user` (or any name you want)
   - **Region**: Oregon (same as your apps)
   - **PostgreSQL Version**: 16 (or latest)
   - **Plan**: Starter ($7/month) - matches your current plan
4. Click "Create Database"
5. Wait 2-3 minutes for provisioning

---

## Step 2: Export Data from Old Database

### Export Inventory Data

```bash
# From your local machine
pg_dump "postgresql://paint_user:hDcrAmN4omkWFk7whYROZkd7Ejby0zrE@dpg-d4blo94hg0os73f1l8og-a.oregon-postgres.render.com/paint_inventory" \
  --no-owner --no-acl --clean --if-exists \
  > /tmp/render-db-full-export.sql
```

This exports:
- All tables (products, transactions, users, etc.)
- All data
- Schema structure

---

## Step 3: Import to New Database

1. **Get new database URL** from Render Dashboard → `matson-bros-db`
   - Copy the "External Database URL"
   - Will look like: `postgresql://matson_user:NEW_PASSWORD@NEW_HOST.render.com:5432/matson_bros`

2. **Import the data**:

```bash
psql "postgresql://matson_user:NEW_PASSWORD@NEW_HOST.render.com:5432/matson_bros" \
  < /tmp/render-db-full-export.sql
```

3. **Create billing tables**:

```bash
export DATABASE_URL="postgresql://matson_user:NEW_PASSWORD@NEW_HOST.render.com:5432/matson_bros"
node backend/scripts/migrate-render-db.js
```

4. **Import billing production data**:

```bash
export DATABASE_URL="postgresql://matson_user:NEW_PASSWORD@NEW_HOST.render.com:5432/matson_bros"
node backend/scripts/import-production-data.js
```

---

## Step 4: Update Environment Variables

Update the database connection for all services:

### Backend API (paint-inventory-api)

1. Go to Render Dashboard → `paint-inventory-api` → Environment
2. Find `DB_URL` or `DATABASE_URL`
3. Update to new database connection string
4. Click "Save Changes"
5. Service will automatically redeploy

### Update render.yaml Files (for future deployments)

Update the database reference in your Blueprint files:

**inventory/render.yaml:**
```yaml
- key: DB_URL
  fromDatabase:
    name: matson-bros-db  # Changed from paint-inventory-db
    property: connectionString
```

Commit and push:
```bash
git add inventory/render.yaml
git commit -m "Update database reference to matson-bros-db"
git push origin main
```

---

## Step 5: Verify Everything Works

### Test Inventory App

1. Open `https://paint-inventory.onrender.com`
2. Log in
3. Check inventory items load
4. Try checking out a product
5. Verify transactions show up

### Test Billing App

1. Open `https://billing-frontend.onrender.com`
2. Log in (same credentials)
3. Check customers load (should see 78)
4. Check invoices load (should see 119)
5. Check services load (should see 44)
6. Open a customer → verify invoices show

### Verify Data Counts

Connect to new database and verify:

```sql
psql "new-database-url"

-- Check all tables exist and have data
SELECT
  'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'customers', COUNT(*) FROM customers
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'transactions', COUNT(*) FROM transactions
UNION ALL
SELECT 'services', COUNT(*) FROM services
UNION ALL
SELECT 'jobs', COUNT(*) FROM jobs
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices;
```

---

## Step 6: Delete Old Database (Optional)

**ONLY** after verifying everything works for at least 24-48 hours:

1. Go to Render Dashboard → `paint-inventory-db`
2. Click "Settings" → "Delete Database"
3. Type the database name to confirm
4. Database will be deleted

⚠️ **This is irreversible!** Make sure you have a backup first.

---

## Rollback Plan

If something goes wrong:

### Immediate Rollback (within 7 days)

Render keeps backups for 7 days. You can restore:

1. Go to deleted database
2. Click "Restore from backup"
3. Select the most recent backup

### Manual Rollback

1. Go to backend service → Environment
2. Change `DB_URL` back to old database URL:
   ```
   postgresql://paint_user:hDcrAmN4omkWFk7whYROZkd7Ejby0zrE@dpg-d4blo94hg0os73f1l8og-a.oregon-postgres.render.com/paint_inventory
   ```
3. Save and redeploy

---

## Cost Impact

**During Migration:**
- Old database: $7/month
- New database: $7/month
- **Total: $14/month** (temporary)

**After Deleting Old Database:**
- New database only: $7/month
- **Total: $7/month** (back to normal)

---

## Alternative: Just Use paint_inventory

**Recommended**: Keep using `paint_inventory` as the database name.

The name is purely cosmetic. Your architecture is:
- Database: `paint_inventory` (contains both inventory AND billing data)
- Backend: Serves both apps
- Frontend 1: Inventory UI
- Frontend 2: Billing UI

This is actually cleaner because:
- ✅ No migration needed
- ✅ No downtime
- ✅ No risk of data loss
- ✅ No extra cost during migration
- ✅ Existing inventory data already there

To proceed with this approach, just use the existing database URL:
```bash
export DATABASE_URL="postgresql://paint_user:hDcrAmN4omkWFk7whYROZkd7Ejby0zrE@dpg-d4blo94hg0os73f1l8og-a.oregon-postgres.render.com/paint_inventory"

# Create billing tables
node backend/scripts/migrate-render-db.js

# Import billing data
node backend/scripts/import-production-data.js
```

Done! Both apps now share the `paint_inventory` database.

---

## My Recommendation

**Don't rename.** Use the existing `paint_inventory` database.

The database name is just metadata. What matters is:
- ✅ Your data is in there
- ✅ Your apps can connect
- ✅ Both inventory and billing tables coexist

Think of `paint_inventory` as your "company database" that happens to contain both inventory and billing data.

If you really want to rename for consistency, you can always do it later when you have more time and after everything is working smoothly.
