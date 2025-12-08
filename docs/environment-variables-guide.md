# Environment Variables Configuration Guide

This guide shows exactly what environment variables to set for each service on Render.

## Overview

Your architecture:
- **1 Database**: `paint-inventory-db` (PostgreSQL)
- **1 Backend API**: `paint-inventory-api` (serves both apps)
- **2 Frontends**: `paint-inventory` and `billing-frontend`

---

## 1. Backend API (`paint-inventory-api`)

Go to Render Dashboard → `paint-inventory-api` → Environment

### Required Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | Enables production optimizations |
| `PORT` | `4444` | Or any port Render assigns |
| `DB_URL` | *Auto-set by Render* | Links to database |
| `JWT_SECRET` | *Auto-generated* | Render generates this |
| `BILLING_URL` | `https://billing-frontend.onrender.com` | Allow CORS from billing |
| `INVENTORY_URL` | `https://paint-inventory.onrender.com` | Allow CORS from inventory |
| `BACKEND_URL` | `https://paint-inventory-api.onrender.com` | Your backend URL |

### Optional Variables (For Email Features)

| Variable | Value | Notes |
|----------|-------|-------|
| `SMTP_HOST` | `smtp.gmail.com` | Gmail SMTP server |
| `SMTP_PORT` | `587` | Standard SMTP port |
| `SMTP_SECURE` | `false` | Use STARTTLS |
| `SMTP_USER` | `your-email@gmail.com` | Your Gmail address |
| `SMTP_PASS` | `your-app-password` | Gmail app password (not regular password) |
| `SMTP_FROM` | `your-email@gmail.com` | From address for emails |

### How to Set Using Render Blueprint

If using `inventory/render.yaml`, the database connection is set automatically:

```yaml
envVars:
  - key: DB_URL
    fromDatabase:
      name: paint-inventory-db
      property: connectionString
```

### Manual Configuration

If setting manually in Render Dashboard:

1. Go to `paint-inventory-api` → Environment
2. Add each variable listed above
3. For `DB_URL`, select "From Database" → Choose `paint-inventory-db`
4. Click "Save Changes"

---

## 2. Inventory Frontend (`paint-inventory`)

Go to Render Dashboard → `paint-inventory` → Environment

### Required Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | Next.js production mode |
| `PORT` | `3333` | Or let Render assign |
| `NEXT_PUBLIC_API_URL` | `https://paint-inventory-api.onrender.com/graphql` | **GraphQL endpoint** |

### Important Notes

- ⚠️ **Must use `/graphql` endpoint** (not `/api`)
- ⚠️ Variable must start with `NEXT_PUBLIC_` to be available in browser
- The frontend makes GraphQL requests to the backend

---

## 3. Billing Frontend (`billing-frontend`)

Go to Render Dashboard → `billing-frontend` → Environment

### Required Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | Next.js production mode |
| `PORT` | `5174` | Or let Render assign |
| `NEXT_PUBLIC_API_URL` | `https://paint-inventory-api.onrender.com/graphql` | **GraphQL endpoint** |

### Important Notes

- Same GraphQL endpoint as inventory (they share the backend)
- Must use `NEXT_PUBLIC_` prefix for client-side access

---

## 4. Database (`paint-inventory-db`)

### Connection Info

Your existing database connection:
```
postgresql://paint_user:hDcrAmN4omkWFk7whYROZkd7Ejby0zrE@dpg-d4blo94hg0os73f1l8og-a.oregon-postgres.render.com/paint_inventory
```

### Database Settings - No Changes Needed

✅ **Current settings are correct:**
- Name: `paint-inventory-db`
- Database: `paint_inventory`
- Region: Oregon
- PostgreSQL Version: (whatever you have)
- Plan: Starter ($7/month recommended)

### External Access

- ✅ External database URL is enabled by default
- ✅ SSL/TLS connections required (already configured in backend)
- ✅ No firewall rules needed (Render handles this)

### What NOT to Change

- ❌ Don't rename the database
- ❌ Don't change the user/password (Render manages this)
- ❌ Don't disable SSL
- ❌ Don't change PostgreSQL version (unless upgrading)

---

## Custom Domain Setup for GraphQL Explorer

You want to access GraphQL Playground at: `graphql.matsonbrotherspainting.com`

### Step 1: Add Custom Domain to Backend Service

1. Go to Render Dashboard → `paint-inventory-api`
2. Click "Settings" → Scroll to "Custom Domains"
3. Click "Add Custom Domain"
4. Enter: `graphql.matsonbrotherspainting.com`
5. Render will show you DNS records to add

### Step 2: Configure DNS

Add these records to your domain registrar (e.g., GoDaddy, Namecheap):

**If Render shows CNAME record:**
```
Type: CNAME
Name: graphql
Value: paint-inventory-api.onrender.com
TTL: 3600 (or default)
```

**If Render shows A record:**
```
Type: A
Name: graphql
Value: [IP address shown by Render]
TTL: 3600
```

### Step 3: Wait for DNS Propagation

- DNS changes take 1-24 hours to propagate
- Check status: `dig graphql.matsonbrotherspainting.com`
- Render will auto-provision SSL certificate (Let's Encrypt)

### Step 4: Update Backend Environment Variables

Once the custom domain is active:

1. Go to `paint-inventory-api` → Environment
2. Update `BACKEND_URL`:
   ```
   BACKEND_URL=https://graphql.matsonbrotherspainting.com
   ```
3. Save changes

### Step 5: Access GraphQL Playground

Visit: `https://graphql.matsonbrotherspainting.com/graphql`

You'll see the Apollo Server landing page with:
- Query your server button → Opens Apollo Sandbox
- GraphQL documentation
- Schema introspection

### Alternative: Use Apollo Studio (Recommended)

Instead of exposing the playground publicly, use Apollo Studio:

1. Visit: https://studio.apollographql.com
2. Click "Connect your GraphQL API"
3. Enter endpoint: `https://graphql.matsonbrotherspainting.com/graphql`
4. You get a full-featured GraphQL IDE with:
   - Schema explorer
   - Query builder
   - Query history
   - Performance metrics
   - Team collaboration

---

## Quick Reference: All URLs

| Service | Internal URL | Custom Domain (Optional) |
|---------|-------------|--------------------------|
| Backend API | `https://paint-inventory-api.onrender.com` | `https://graphql.matsonbrotherspainting.com` |
| GraphQL Endpoint | `https://paint-inventory-api.onrender.com/graphql` | `https://graphql.matsonbrotherspainting.com/graphql` |
| Inventory Frontend | `https://paint-inventory.onrender.com` | `https://inventory.matsonbrotherspainting.com` |
| Billing Frontend | `https://billing-frontend.onrender.com` | `https://billing.matsonbrotherspainting.com` |
| Database | Internal only (via `DB_URL`) | N/A |

---

## Testing Your Configuration

### Test Backend Health

```bash
curl https://paint-inventory-api.onrender.com/health
# Should return: {"status":"ok","timestamp":"..."}
```

### Test GraphQL Endpoint

```bash
curl -X POST https://paint-inventory-api.onrender.com/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'
# Should return: {"data":{"__typename":"Query"}}
```

### Test Inventory Frontend

Visit: `https://paint-inventory.onrender.com`
- Should load the login page
- Should be able to log in
- Should see inventory items

### Test Billing Frontend

Visit: `https://billing-frontend.onrender.com`
- Should load the login page
- Should be able to log in with same credentials
- Should see 78 customers, 119 invoices

---

## Security Best Practices

### JWT Secret

- ✅ Let Render auto-generate (`generateValue: true`)
- ❌ Don't use a weak secret
- ❌ Don't commit secrets to Git
- ⚠️ If you change JWT_SECRET, all users must re-login

### SMTP Credentials

For Gmail:
1. Enable 2-Factor Authentication
2. Go to: https://myaccount.google.com/apppasswords
3. Create "App Password" for Mail
4. Use that password (16 characters, no spaces)
5. ❌ Don't use your regular Gmail password

### Database

- ✅ Use `DB_URL` from Render (includes SSL)
- ✅ External connections use SSL/TLS
- ✅ Render rotates credentials on plan changes
- ❌ Don't expose database credentials publicly

### CORS Configuration

The backend allows these origins:
- `BILLING_URL` (your billing frontend)
- `INVENTORY_URL` (your inventory frontend)
- `BACKEND_URL` (for GraphQL Playground)
- `https://studio.apollographql.com` (for Apollo Studio)

To add more origins, update `server.js` and redeploy.

---

## Troubleshooting

### "CORS error" in frontend

**Problem**: Frontend can't connect to backend

**Solution**:
1. Check `NEXT_PUBLIC_API_URL` ends with `/graphql`
2. Verify backend has correct `BILLING_URL` and `INVENTORY_URL`
3. Check browser console for exact error
4. Ensure URLs don't have trailing slashes

### "Database connection error"

**Problem**: Backend can't connect to database

**Solution**:
1. Check `DB_URL` is set (should be auto-set)
2. Verify it's linked to `paint-inventory-db`
3. Check Render logs: `paint-inventory-api` → Logs
4. Ensure database is running (not suspended)

### "Invalid token" or "Unauthorized"

**Problem**: Authentication failing

**Solution**:
1. Clear browser cookies/localStorage
2. Log out and log back in
3. Check `JWT_SECRET` is the same across all deploys
4. Verify token is being sent in Authorization header

### GraphQL Playground not loading

**Problem**: Can't access `/graphql` endpoint

**Solution**:
1. Verify backend is deployed with updated `server.js`
2. Check `introspection: true` is set in Apollo Server
3. Try Apollo Studio instead: https://studio.apollographql.com
4. Check backend logs for errors

### Custom domain not working

**Problem**: `graphql.matsonbrotherspainting.com` not resolving

**Solution**:
1. Check DNS records are correct
2. Wait for DNS propagation (up to 24 hours)
3. Test DNS: `dig graphql.matsonbrotherspainting.com`
4. Check Render shows "Active" status for custom domain
5. Verify SSL certificate is provisioned

---

## Environment Variables Checklist

Use this checklist when deploying:

### Backend (`paint-inventory-api`)
- [ ] `NODE_ENV=production`
- [ ] `PORT=4444`
- [ ] `DB_URL` (from database)
- [ ] `JWT_SECRET` (auto-generated)
- [ ] `BILLING_URL=https://billing-frontend.onrender.com`
- [ ] `INVENTORY_URL=https://paint-inventory.onrender.com`
- [ ] `BACKEND_URL=https://paint-inventory-api.onrender.com`
- [ ] SMTP variables (optional, for emails)

### Inventory Frontend (`paint-inventory`)
- [ ] `NODE_ENV=production`
- [ ] `PORT=3333`
- [ ] `NEXT_PUBLIC_API_URL=https://paint-inventory-api.onrender.com/graphql`

### Billing Frontend (`billing-frontend`)
- [ ] `NODE_ENV=production`
- [ ] `PORT=5174`
- [ ] `NEXT_PUBLIC_API_URL=https://paint-inventory-api.onrender.com/graphql`

### Database (`paint-inventory-db`)
- [ ] No changes needed
- [ ] Verify it's running
- [ ] Check connection from backend works

---

## Summary

### What You Need to Do

1. **Backend**: Add environment variables listed above
2. **Frontends**: Set `NEXT_PUBLIC_API_URL` to GraphQL endpoint
3. **Database**: No changes needed (already configured)
4. **Custom Domain**: Optional, follow steps above for `graphql.matsonbrotherspainting.com`

### What's Already Done

✅ Database has all billing tables
✅ Production data imported (78 customers, 119 invoices, etc.)
✅ SSL configured
✅ GraphQL introspection enabled
✅ CORS configured for your frontends

### Next Steps

1. Set environment variables on Render
2. Deploy/redeploy services
3. Test each app
4. (Optional) Set up custom domains
5. Access GraphQL Playground at `/graphql` endpoint
