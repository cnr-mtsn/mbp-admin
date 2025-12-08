# UUID Migration Guide

This guide explains how to convert your existing database tables from SERIAL (integer) IDs to UUID.

## What Changed

All tables in both the **inventory** and **billing** apps now use UUID instead of SERIAL for their ID fields:

### Inventory App Tables
- `users` - SERIAL → UUID
- `products` - Already using UUID ✓
- `transactions` - SERIAL → UUID

### Billing App Tables
- `customers` - SERIAL → UUID
- `estimates` - SERIAL → UUID
- `jobs` - SERIAL → UUID
- `invoices` - SERIAL → UUID

### Shared Table
- `users` table is shared between both apps and has been converted to UUID

## Migration Options

### Option 1: Fresh Start (Recommended for new/empty databases)

If you don't have important data yet, simply drop and recreate all tables:

```bash
# Connect to PostgreSQL and drop billing tables
psql -U cnrmtsn -d matson_bros -c "DROP TABLE IF EXISTS invoices CASCADE;"
psql -U cnrmtsn -d matson_bros -c "DROP TABLE IF EXISTS jobs CASCADE;"
psql -U cnrmtsn -d matson_bros -c "DROP TABLE IF EXISTS estimates CASCADE;"
psql -U cnrmtsn -d matson_bros -c "DROP TABLE IF EXISTS customers CASCADE;"

# Drop inventory tables
psql -U cnrmtsn -d matson_bros -c "DROP TABLE IF EXISTS transactions CASCADE;"
psql -U cnrmtsn -d matson_bros -c "DROP TABLE IF EXISTS products CASCADE;"
psql -U cnrmtsn -d matson_bros -c "DROP TABLE IF EXISTS users CASCADE;"

# Run migrations to recreate with UUIDs
cd /Users/cnrmtsn/Development/matson-bros/inventory/backend
npm run migrate

cd /Users/cnrmtsn/Development/matson-bros/billing/backend
npm run migrate
```

### Option 2: Convert Existing Tables (For databases with data)

If you have existing data that you want to keep:

#### Step 1: Convert Users Table (affects both apps)
```bash
cd /Users/cnrmtsn/Development/matson-bros
node convert-users-to-uuid.js
```

⚠️ **Warning**: This will regenerate all user IDs. You'll need to log in again.

#### Step 2: Convert Billing Tables
```bash
cd /Users/cnrmtsn/Development/matson-bros/billing/backend
node scripts/convert-to-uuid.js
```

⚠️ **Warning**: This will regenerate all IDs for customers, estimates, jobs, and invoices.

## What to Do Next

1. Choose your migration option (fresh start or convert existing)
2. Run the appropriate commands
3. Test both apps to ensure everything works
4. You may need to log in again as user tokens might be invalidated

## Why UUIDs?

- **Security**: UUIDs are non-sequential and unpredictable, making it harder for attackers to guess valid IDs
- **Distributed Systems**: UUIDs can be generated independently without coordination
- **Scalability**: No need for a central ID generator
- **Privacy**: Prevents leaking information about database size or record counts

## Troubleshooting

### Error: "column 'id' is of type uuid but expression is of type integer"
- This means you're trying to insert an integer ID into a UUID field
- Solution: Let the database generate the UUID automatically, or use `uuid_generate_v4()`

### Error: "relation already exists"
- The table already exists from a previous migration
- Solution: Either drop the table first or use the conversion scripts

### Authentication Issues After Migration
- User IDs have changed after UUID conversion
- Solution: Log out and log back in to get a new token with the updated UUID
