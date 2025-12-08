# UUID Migration Steps for Unified Backend

## Current Situation

You've successfully merged the billing and inventory backends into a single GraphQL API. However, the `users` and `transactions` tables may still be using integer IDs instead of UUIDs.

## Why This Matters

- **Consistency**: All tables should use UUIDs for the GID system to work properly
- **Security**: UUIDs are non-sequential and harder to guess
- **GID Format**: The Shopify-style GID format (`gid://matson-bros/Type/13-digit`) works best with UUIDs

## Step 1: Check Current Schema

First, verify which tables need migration:

```bash
cd /Users/cnrmtsn/Development/matson-bros
node check-current-schema.js
```

This will show you:
- ✅ Tables already using UUID
- ❌ Tables that need migration
- ⚠️  Tables that don't exist yet

Expected output should show all tables as UUID:
- `users` → UUID
- `transactions` → UUID
- `products` → UUID (already migrated)
- `customers` → UUID (already migrated)
- `estimates` → UUID (already migrated)
- `jobs` → UUID (already migrated)
- `invoices` → UUID (already migrated)

## Step 2: Backup Your Database (IMPORTANT!)

Before running any migration:

```bash
pg_dump -U cnrmtsn matson_bros > matson_bros_backup_$(date +%Y%m%d).sql
```

## Step 3: Run UUID Migration

If the check shows tables need migration:

```bash
cd /Users/cnrmtsn/Development/matson-bros
node migrate-all-to-uuid.js
```

This script will:
1. Check current schema for all tables
2. Migrate `users` table to UUID
3. Migrate `transactions` table to UUID
4. Verify all other tables are UUID
5. Handle foreign key relationships

⚠️  **IMPORTANT**: This will regenerate all IDs. Existing data will have new UUIDs assigned.

## Step 4: Verify Migration

Run the check script again to confirm:

```bash
node check-current-schema.js
```

All tables should now show ✅ UUID.

## Step 5: Test the Unified Backend

Start the unified backend:

```bash
cd /Users/cnrmtsn/Development/matson-bros/billing/backend
npm start
```

Server should start on port 4000. Test some queries:

```bash
# Health check
curl http://localhost:4000/health

# GraphQL introspection
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __schema { queryType { name } } }"}'
```

## Step 6: Update Frontend Applications

Both your inventory and billing frontends should now point to:

```
http://localhost:4000/graphql
```

Update the GraphQL endpoint in your frontend configuration files.

## GID Format

After migration, all IDs will use the GID format:

```
gid://matson-bros/User/0000000000001
gid://matson-bros/Product/0000550e8400e
gid://matson-bros/Transaction/06ba7b8109dad
gid://matson-bros/Customer/0000550e8400e
```

## Troubleshooting

### "column 'id' is of type uuid but expression is of type integer"

This means some code is still trying to insert integer IDs. The migration should fix this at the database level.

### Authentication Issues After Migration

User IDs have changed after UUID conversion. Solution:
1. Log out of both apps
2. Log back in to get new tokens with UUID-based user IDs

### Foreign Key Constraint Errors

If you see foreign key errors, it means related tables weren't migrated together. The migration script handles this, but if issues persist:

```bash
# Check foreign key constraints
psql -U cnrmtsn -d matson_bros -c "\d+ transactions"
psql -U cnrmtsn -d matson_bros -c "\d+ invoices"
```

## Alternative: Fresh Start

If you don't have important data, you can start fresh:

```bash
# Drop all tables
psql -U cnrmtsn -d matson_bros << EOF
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS estimates CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;
EOF

# Recreate tables (if you have migration scripts)
# cd /path/to/backend && npm run migrate
```

## Next Steps

Once UUID migration is complete:

1. ✅ All tables use UUID
2. ✅ GID system works across all entities
3. ✅ Single unified backend on port 4000
4. ✅ Both inventory and billing operations available via GraphQL

## Files Created

- `/Users/cnrmtsn/Development/matson-bros/check-current-schema.js` - Schema verification
- `/Users/cnrmtsn/Development/matson-bros/migrate-all-to-uuid.js` - UUID migration
- `/Users/cnrmtsn/Development/matson-bros/billing/backend/` - Unified backend (port 4000)

## Questions?

If migration fails or you encounter issues, check:
1. Database connection settings in scripts match your setup
2. User has permissions to ALTER tables
3. No active connections are blocking the migration
4. Backup exists before retrying
