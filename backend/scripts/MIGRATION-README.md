# Production UUID Migration Guide

## Overview

This migration converts all database tables from integer IDs to UUID primary keys for consistency across the entire application.

## What This Migration Does

The `migrate-production-to-uuid.js` script will:

1. ✅ Enable the `uuid-ossp` extension
2. ✅ Convert the following tables to use UUIDs:
   - `users` - Authentication/authorization
   - `customers` - Customer data
   - `products` - Inventory products
   - `transactions` - Inventory transactions
   - `estimates` - Billing estimates
   - `jobs` - Billing jobs
   - `invoices` - Billing invoices
   - `services` - Billing services

3. ✅ Update all foreign key relationships
4. ✅ Create tables with UUID if they don't exist

## ⚠️ IMPORTANT WARNINGS

1. **This will change ALL existing IDs** - All integer IDs will be replaced with new UUIDs
2. **Data relationships will be broken** - Existing foreign key relationships will be regenerated with new UUIDs
3. **Backup required** - Always backup your database before running this migration
4. **Downtime recommended** - Run this during maintenance windows or off-peak hours
5. **One-way migration** - You cannot easily roll back to integer IDs after this migration

## Prerequisites

1. Database backup completed
2. Production database URL available
3. Node.js environment set up
4. All applications temporarily stopped (recommended)

## How to Run the Migration

### Step 1: Backup Your Database

```bash
# For Render databases, use their dashboard to create a backup
# Or use pg_dump:
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql
```

### Step 2: Set Environment Variables

```bash
# Export your production database URL
export DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
# Or
export DB_URL="postgresql://user:password@host:5432/database?sslmode=require"
```

### Step 3: Run the Migration

```bash
# From the backend directory
node scripts/migrate-production-to-uuid.js
```

### Step 4: Verify the Migration

The script will output the status of each table conversion. Look for:

```
✅ users: id type = uuid
✅ customers: id type = uuid
✅ products: id type = uuid
✅ transactions: id type = uuid
✅ estimates: id type = uuid
✅ jobs: id type = uuid
✅ invoices: id type = uuid
✅ services: id type = uuid
```

### Step 5: Deploy Code Changes

After the migration completes successfully, deploy the updated code that includes:

1. Updated `gid.js` - Removed User integer special case
2. All resolvers now handle UUIDs consistently

```bash
git add .
git commit -m "Migrate production database to UUIDs"
git push
```

### Step 6: Test Authentication

Test login functionality to ensure the UUID migration is working:

```bash
# Test login via GraphQL
curl -X POST https://your-backend.onrender.com/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { login(username: \"testuser\", password: \"testpass\") { token user { id name email } } }"}'
```

## Rollback Instructions

If the migration fails or you need to rollback:

```bash
# Restore from backup
psql $DATABASE_URL < backup-YYYYMMDD-HHMMSS.sql
```

## Testing Locally First

**HIGHLY RECOMMENDED:** Test the migration on a copy of your production data first:

```bash
# 1. Create a local test database
createdb matson_bros_test

# 2. Import production data
pg_dump $PRODUCTION_DATABASE_URL | psql matson_bros_test

# 3. Run migration on test database
DATABASE_URL="postgresql://localhost/matson_bros_test" node scripts/migrate-production-to-uuid.js

# 4. Verify everything works
# 5. Drop test database
dropdb matson_bros_test
```

## What Gets Fixed

After this migration, the following issues will be resolved:

1. ✅ Login failures due to ID type mismatches
2. ✅ Consistent ID format across all tables
3. ✅ Global ID (GID) generation works uniformly
4. ✅ Frontend can use the same ID handling logic for all resources

## Support

If you encounter any issues:

1. Check the error output from the migration script
2. Verify your DATABASE_URL is correct
3. Ensure the database user has sufficient privileges
4. Review the transaction logs in the database

## Migration Script Details

**File:** `scripts/migrate-production-to-uuid.js`

**Transaction Safety:** The entire migration runs in a single transaction. If any step fails, all changes are rolled back.

**Idempotent:** The script checks if tables are already using UUIDs and skips conversion if so. Safe to run multiple times.

**Creates Missing Tables:** If tables don't exist, they will be created with UUID primary keys.
