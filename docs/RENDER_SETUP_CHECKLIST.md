# Render Deployment Checklist

Quick reference for deploying your Matson Brothers Painting admin system.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Custom Domains (Optional)                │
├─────────────────────────────────────────────────────────────┤
│  graphql.matsonbrotherspainting.com  → Backend API          │
│  inventory.matsonbrotherspainting.com → Inventory Frontend  │
│  billing.matsonbrotherspainting.com   → Billing Frontend    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐
│  Inventory Frontend  │    │   Billing Frontend   │    │   Backend GraphQL    │
│  paint-inventory     │    │  billing-frontend    │    │  paint-inventory-api │
├──────────────────────┤    ├──────────────────────┤    ├──────────────────────┤
│ Next.js (Port 3333)  │    │ Next.js (Port 5174)  │    │ Node/Express/Apollo  │
│                      │    │                      │    │     (Port 4444)      │
│ ENV:                 │    │ ENV:                 │    │                      │
│ NEXT_PUBLIC_API_URL  │───>│ NEXT_PUBLIC_API_URL  │───>│ ENV:                 │
│ =.../graphql         │    │ =.../graphql         │    │ DB_URL (auto)        │
└──────────────────────┘    └──────────────────────┘    │ JWT_SECRET (auto)    │
                                                         │ BILLING_URL          │
                                                         │ INVENTORY_URL        │
                                                         │ BACKEND_URL          │
                                                         └──────────┬───────────┘
                                                                    │
                                                                    ↓
                                                         ┌──────────────────────┐
                                                         │      Database        │
                                                         │ paint-inventory-db   │
                                                         ├──────────────────────┤
                                                         │ PostgreSQL (Starter) │
                                                         │                      │
                                                         │ Tables:              │
                                                         │ • users (shared)     │
                                                         │ • customers (shared) │
                                                         │ • products           │
                                                         │ • transactions       │
                                                         │ • services           │
                                                         │ • jobs               │
                                                         │ • invoices           │
                                                         │ • estimates          │
                                                         └──────────────────────┘
```

## Deployment Checklist

### ✅ Prerequisites (Already Done)

-   [x] Database created (`paint-inventory-db`)
-   [x] Billing tables created
-   [x] Production data imported (78 customers, 119 invoices, 44 services, 15 jobs)
-   [x] Backend code updated with GraphQL introspection
-   [x] Code pushed to GitHub

### 🚀 Backend API Setup

#### 1. Create or Update Service

-   [ ] Service name: `paint-inventory-api`
-   [ ] Region: Oregon
-   [ ] Branch: `main`
-   [ ] Root directory: `backend`
-   [ ] Build command: `npm install`
-   [ ] Start command: `npm start`

#### 2. Set Environment Variables

Go to `paint-inventory-api` → Environment:

-   [ ] `NODE_ENV` = `production`
-   [ ] `PORT` = `4444` (or let Render assign)
-   [ ] `DB_URL` = Link to `paint-inventory-db` database
-   [ ] `JWT_SECRET` = Auto-generate or set securely
-   [ ] `BILLING_URL` = `https://billing-frontend.onrender.com`
-   [ ] `INVENTORY_URL` = `https://paint-inventory.onrender.com`
-   [ ] `BACKEND_URL` = `https://paint-inventory-api.onrender.com`

Optional (for email features):

-   [ ] `EMAIL_HOST` = `smtp.gmail.com`
-   [ ] `EMAIL_PORT` = `587`
-   [ ] `EMAIL_USER` = Your Gmail address
-   [ ] `EMAIL_PASSWORD` = Gmail app password
-   [ ] `EMAIL_FROM` = Your Gmail address

#### 3. Deploy

-   [ ] Click "Create Web Service" or "Manual Deploy"
-   [ ] Wait for build (~2-5 minutes)
-   [ ] Check logs for errors
-   [ ] Test health endpoint: `https://[your-backend].onrender.com/health`

### 📦 Inventory Frontend Setup

#### 1. Create Service (if not exists)

-   [ ] Service name: `paint-inventory`
-   [ ] Region: Oregon
-   [ ] Branch: `main`
-   [ ] Root directory: `inventory`
-   [ ] Build command: `npm install && npm run build`
-   [ ] Start command: `npm start`

#### 2. Set Environment Variables

Go to `paint-inventory` → Environment:

-   [ ] `NODE_ENV` = `production`
-   [ ] `PORT` = `3333` (or let Render assign)
-   [ ] `NEXT_PUBLIC_API_URL` = `https://paint-inventory-api.onrender.com/graphql`

#### 3. Deploy

-   [ ] Deploy the service
-   [ ] Wait for build (~3-5 minutes)
-   [ ] Test: Open inventory app URL
-   [ ] Verify: Can log in and see products

### 💰 Billing Frontend Setup

#### 1. Create Service

-   [ ] Service name: `billing-frontend`
-   [ ] Region: Oregon
-   [ ] Branch: `main`
-   [ ] Root directory: `billing`
-   [ ] Build command: `npm install && npm run build`
-   [ ] Start command: `npm start`

#### 2. Set Environment Variables

Go to `billing-frontend` → Environment:

-   [ ] `NODE_ENV` = `production`
-   [ ] `PORT` = `5174` (or let Render assign)
-   [ ] `NEXT_PUBLIC_API_URL` = `https://paint-inventory-api.onrender.com/graphql`

#### 3. Deploy

-   [ ] Deploy the service
-   [ ] Wait for build (~3-5 minutes)
-   [ ] Test: Open billing app URL
-   [ ] Verify: Can log in and see customers/invoices

### 🗄️ Database Configuration

#### No Changes Needed!

Your database is already configured:

-   ✅ Name: `paint-inventory-db`
-   ✅ Tables created
-   ✅ Production data imported
-   ✅ SSL enabled
-   ✅ Linked to backend

### 🎮 GraphQL Playground Access

After backend is deployed, you can access GraphQL Playground at:

```
https://paint-inventory-api.onrender.com/graphql
```

Or use Apollo Studio:

1. Go to https://studio.apollographql.com
2. Click "Connect your GraphQL API"
3. Enter: `https://paint-inventory-api.onrender.com/graphql`

### 🌐 Custom Domains (Optional)

#### For GraphQL Endpoint

1. Go to `paint-inventory-api` → Settings → Custom Domains
2. Add: `graphql.matsonbrotherspainting.com`
3. Add DNS record at your registrar:
    ```
    Type: CNAME
    Name: graphql
    Value: paint-inventory-api.onrender.com
    ```
4. Wait for DNS propagation (1-24 hours)
5. Update `BACKEND_URL` env var to new domain

#### For Inventory App

1. Go to `paint-inventory` → Settings → Custom Domains
2. Add: `inventory.matsonbrotherspainting.com`
3. Add DNS record:
    ```
    Type: CNAME
    Name: inventory
    Value: paint-inventory.onrender.com
    ```
4. Update `INVENTORY_URL` on backend

#### For Billing App

1. Go to `billing-frontend` → Settings → Custom Domains
2. Add: `billing.matsonbrotherspainting.com`
3. Add DNS record:
    ```
    Type: CNAME
    Name: billing
    Value: billing-frontend.onrender.com
    ```
4. Update `BILLING_URL` on backend

## Testing Checklist

### Backend API

-   [ ] Health check works: `curl https://[backend]/health`
-   [ ] GraphQL responds: `curl -X POST https://[backend]/graphql -H "Content-Type: application/json" -d '{"query":"{ __typename }"}'`
-   [ ] GraphQL Playground loads in browser
-   [ ] Can see schema documentation

### Inventory App

-   [ ] App loads without errors
-   [ ] Login page displays
-   [ ] Can log in with credentials
-   [ ] Products table loads
-   [ ] Can check out a product
-   [ ] Transactions appear in history

### Billing App

-   [ ] App loads without errors
-   [ ] Login page displays
-   [ ] Can log in (same credentials as inventory)
-   [ ] Customers page shows 78 customers
-   [ ] Invoices page shows 119 invoices
-   [ ] Services page shows 44 services
-   [ ] Jobs page shows 15 jobs
-   [ ] Can open customer detail
-   [ ] Can open invoice detail

### Cross-App Verification

-   [ ] Both apps can log in with same user
-   [ ] Customers are shared between apps
-   [ ] Creating a customer in billing shows in both apps
-   [ ] JWT tokens work across both apps

## Troubleshooting

### Backend won't start

1. Check Render logs: `paint-inventory-api` → Logs
2. Verify `DB_URL` is set correctly
3. Check `JWT_SECRET` is present
4. Look for database connection errors

### Frontend shows blank page

1. Check browser console for errors
2. Verify `NEXT_PUBLIC_API_URL` ends with `/graphql`
3. Check backend is running
4. Verify CORS settings on backend

### CORS errors

1. Backend logs will show "Not allowed by CORS"
2. Check `BILLING_URL` and `INVENTORY_URL` match frontend URLs exactly
3. No trailing slashes
4. Use https:// not http://

### Database connection fails

1. Verify database is not suspended (free tier suspends after inactivity)
2. Check database is in same region as backend
3. Verify SSL is enabled in backend config
4. Check `DB_URL` is linked to correct database

### GraphQL Playground not loading

1. Verify backend deployed with updated `server.js`
2. Check `introspection: true` is set
3. Try Apollo Studio instead
4. Check backend logs for Apollo Server errors

## Cost Summary

| Service            | Plan    | Cost/Month    |
| ------------------ | ------- | ------------- |
| Backend API        | Starter | $7            |
| Inventory Frontend | Starter | $7            |
| Billing Frontend   | Starter | $7            |
| Database           | Starter | $7            |
| **Total**          |         | **$28/month** |

**Free Tier Option**: All services can run on Free tier for testing, but will spin down after 15 minutes of inactivity.

## Support Resources

-   Full env var guide: `docs/environment-variables-guide.md`
-   Deployment guide: `docs/billing-deployment-guide.md`
-   Data migration: `docs/production-data-migration.md`
-   Render docs: https://render.com/docs

## Quick Links

Once deployed, bookmark these:

-   Backend Health: `https://paint-inventory-api.onrender.com/health`
-   GraphQL Playground: `https://paint-inventory-api.onrender.com/graphql`
-   Inventory App: `https://paint-inventory.onrender.com`
-   Billing App: `https://billing-frontend.onrender.com`
-   Render Dashboard: https://dashboard.render.com

---

**Last Updated**: After production data migration complete ✅
