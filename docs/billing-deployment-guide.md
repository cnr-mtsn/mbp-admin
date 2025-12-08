# Billing App Deployment Guide for Render

This guide walks you through deploying the billing app to Render and updating the shared database so both billing and inventory apps work together.

## Architecture Overview

Your setup uses:
- **Single Backend API** (`paint-inventory-api`) - Serves both apps via GraphQL
- **Single Database** (`paint-inventory-db`) - Shared PostgreSQL database
- **Two Frontends**:
  - Inventory Frontend (`paint-inventory`) - Port 3333
  - Billing Frontend (`billing-frontend`) - Port 5174

## Current State

✅ **Local Database** - Updated with:
- `customers` table (with `company_name` field)
- `estimates` table
- `jobs` table
- `invoices` table
- `services` table (new)
- `users` table (shared)
- `products` table (inventory)
- `transactions` table (inventory)

❌ **Render Database** - Needs updating with billing tables

## Deployment Steps

### Step 1: Update Backend API on Render

The backend already exists (`paint-inventory-api`), but needs to include billing resolvers and routes.

1. **Ensure backend has all billing code**:
   ```bash
   cd /Users/cnrmtsn/Development/matson-bros/backend
   ls graphql/  # Should show billing resolvers
   ls routes/   # Should show billing routes
   ```

2. **Push backend changes to Git** (if not already done):
   ```bash
   cd /Users/cnrmtsn/Development/matson-bros
   git add backend/
   git commit -m "Add billing API endpoints and GraphQL resolvers"
   git push origin main
   ```

3. **Trigger redeploy in Render**:
   - Go to https://dashboard.render.com
   - Find `paint-inventory-api` service
   - Click "Manual Deploy" → "Deploy latest commit"
   - Wait for deployment to complete (~2-5 minutes)

### Step 2: Update Database Schema on Render

Your Render database needs the new billing tables. We'll run a migration script.

#### Option A: Using Render Shell (Recommended)

1. **Go to Render Dashboard**:
   - Navigate to https://dashboard.render.com
   - Find your `paint-inventory-api` service
   - Click "Shell" in the left sidebar

2. **Run migration script**:
   ```bash
   node scripts/migrate-render-db.js
   ```

3. **Verify output**:
   You should see:
   ```
   ✓ UUID extension enabled
   ✓ Created customers table (or already exists)
   ✓ Created services table
   ✓ Created estimates table
   ✓ Created jobs table
   ✓ Created invoices table
   ✅ Database migration completed successfully!
   ```

#### Option B: Using Local psql with Render DATABASE_URL

1. **Get your Render database URL**:
   - Go to Render Dashboard → `paint-inventory-db`
   - Copy the "External Database URL"
   - Format: `postgres://user:pass@host:port/dbname`

2. **Run migration locally against Render DB**:
   ```bash
   cd /Users/cnrmtsn/Development/matson-bros/backend
   export DATABASE_URL="your-render-database-url-here"
   node scripts/migrate-render-db.js
   ```

### Step 3: Deploy Billing Frontend to Render

Now deploy the billing frontend as a new service.

#### Method 1: Using Render Blueprint (Fastest)

1. **Push render.yaml to Git**:
   ```bash
   cd /Users/cnrmtsn/Development/matson-bros
   git add billing/render.yaml
   git commit -m "Add Render deployment config for billing app"
   git push origin main
   ```

2. **Create New Web Service in Render**:
   - Go to https://dashboard.render.com
   - Click "New" → "Blueprint"
   - Connect your repository
   - Select `billing/render.yaml`
   - Click "Apply"

#### Method 2: Manual Service Creation

1. **Go to Render Dashboard** → "New" → "Web Service"

2. **Connect Repository**:
   - Select your GitHub/GitLab repository
   - Choose the branch (usually `main`)

3. **Configure Service**:
   - **Name**: `billing-frontend`
   - **Region**: Oregon (same as backend)
   - **Branch**: `main`
   - **Root Directory**: `billing`
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Starter ($7/month) or Free

4. **Environment Variables**:
   - `NODE_ENV` = `production`
   - `PORT` = `5174`
   - `NEXT_PUBLIC_API_URL` = `https://paint-inventory-api.onrender.com/graphql`

5. **Click "Create Web Service"**

6. **Wait for deployment** (~3-5 minutes)

### Step 4: Verify Deployment

1. **Check Backend Health**:
   ```bash
   curl https://paint-inventory-api.onrender.com/health
   ```
   Should return: `{"status":"ok"}`

2. **Test GraphQL Endpoint**:
   ```bash
   curl -X POST https://paint-inventory-api.onrender.com/graphql \
     -H "Content-Type: application/json" \
     -d '{"query":"{ __typename }"}'
   ```

3. **Access Billing Frontend**:
   - Open `https://billing-frontend.onrender.com` (or your custom domain)
   - Try logging in with your credentials
   - Navigate to Customers, Estimates, Invoices, etc.

4. **Verify Both Apps Work**:
   - **Inventory App**: `https://paint-inventory.onrender.com`
   - **Billing App**: `https://billing-frontend.onrender.com`
   - Both should be able to authenticate and access shared data

### Step 5: Import Production Data (Optional)

If you have existing customer or service data to import:

1. **Using Render Shell**:
   ```bash
   # In Render Shell for paint-inventory-api
   node scripts/import-customers-xls.js
   node scripts/import-services-xls.js
   node scripts/import-invoices-xls.js
   ```

2. **Or upload via API** using your local scripts with production API URL

## Troubleshooting

### Issue: "Cannot connect to database"

**Solution**: Check that `DB_URL` environment variable is set correctly in Render.
- Go to `paint-inventory-api` → Environment
- Verify `DB_URL` references the correct database connection string

### Issue: "Table does not exist"

**Solution**: Migration didn't run properly.
1. Check Render Shell logs during migration
2. Verify UUID extension is enabled:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'uuid-ossp';
   ```
3. Re-run migration script

### Issue: "Auth token invalid" after deployment

**Solution**: JWT secret mismatch.
- Ensure `JWT_SECRET` is the same across:
  - Backend production environment
  - Your local `.env` file (if testing)
- Log out and log back in to get new tokens

### Issue: "500 Internal Server Error" on billing frontend

**Solution**: Check backend logs.
1. Go to Render Dashboard → `paint-inventory-api` → Logs
2. Look for errors related to missing resolvers or database queries
3. Ensure all billing GraphQL resolvers are deployed

### Issue: Billing data not showing in inventory app (or vice versa)

**Expected Behavior**:
- Customer data IS shared between apps
- Users/auth IS shared between apps
- Products (inventory-only) won't show in billing
- Invoices/estimates (billing-only) won't show in inventory

This is correct! Each app has its own domain-specific tables, but shares users and customers.

## Database Schema Reference

After successful migration, your Render database should have:

```sql
-- Shared tables
users           -- Authentication for both apps
customers       -- Shared customer data

-- Inventory-specific
products        -- Paint inventory items
transactions    -- Inventory movements

-- Billing-specific
services        -- Painting services offered
estimates       -- Price quotes
jobs            -- Active painting jobs
invoices        -- Billing/payment tracking
```

## Environment Variables Reference

### Backend (paint-inventory-api)
```
NODE_ENV=production
PORT=4444
DB_URL=<from Render database>
JWT_SECRET=<generated by Render>
FRONTEND_URL=https://billing-frontend.onrender.com
ADMIN_EMAIL=conner@matsonbrotherspainting.com
ADMIN_PASSWORD=<set manually in Render>
```

### Inventory Frontend
```
NODE_ENV=production
PORT=3333
NEXT_PUBLIC_API_URL=https://paint-inventory-api.onrender.com/api
```

### Billing Frontend
```
NODE_ENV=production
PORT=5174
NEXT_PUBLIC_API_URL=https://paint-inventory-api.onrender.com/graphql
```

## Cost Breakdown

- **Backend API**: $7/month (Starter plan)
- **Database**: $7/month (Starter plan - 256MB)
- **Inventory Frontend**: $7/month (Starter plan)
- **Billing Frontend**: $7/month (Starter plan)

**Total**: $28/month

**Free Tier Option**: All services can run on Free tier during testing, but will spin down after 15 minutes of inactivity.

## Next Steps After Deployment

1. **Set up custom domains** (optional):
   - `inventory.matsonbrotherspainting.com`
   - `billing.matsonbrotherspainting.com`

2. **Enable HTTPS** (automatic with Render)

3. **Set up monitoring**:
   - Render provides basic metrics
   - Set up error tracking (Sentry, etc.)

4. **Create database backups**:
   - Render auto-backups on Starter plan
   - Consider manual exports for critical data

5. **Update local development**:
   - Use production API for testing: `NEXT_PUBLIC_API_URL=https://paint-inventory-api.onrender.com/graphql`
   - Or keep using local backend for development

## Support

If you encounter issues:
1. Check Render logs (Dashboard → Service → Logs)
2. Review this guide's troubleshooting section
3. Verify environment variables are set correctly
4. Check database connection with `psql` using External Database URL

## Files Created

- `/billing/render.yaml` - Render deployment config
- `/backend/scripts/migrate-render-db.js` - Production DB migration
- `/docs/billing-deployment-guide.md` - This guide
