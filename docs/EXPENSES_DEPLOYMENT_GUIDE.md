# Expenses & Email Monitoring - Production Deployment Guide

This guide walks you through deploying the expenses tracking and automated invoice email monitoring features to production.

## Overview

The new features include:
- Automated email monitoring for invoice emails from suppliers
- PDF parsing of Spectrum Paint invoices
- Automatic expense record creation
- Expenses table in database
- Email monitoring cron job (runs every 30 minutes)

## Prerequisites

- [x] Local development tested and working
- [ ] Production database access
- [ ] Render backend service access
- [ ] GitHub repository access

---

## Step 1: Create Expenses Table in Production Database

You have two options for creating the table:

### Option A: Using the Script (Recommended)

1. **Temporarily update your `.env` file** to use the production database:

```bash
# Comment out local database
# DATABASE_URL=postgresql://cnrmtsn@localhost:5432/matson_bros

# Uncomment production database
DATABASE_URL=postgresql://paint_user:hDcrAmN4omkWFk7whYROZkd7Ejby0zrE@dpg-d4blo94hg0os73f1l8og-a.oregon-postgres.render.com/paint_inventory
```

2. **Set NODE_ENV to production**:

```bash
NODE_ENV=production
```

3. **Run the table creation script**:

```bash
cd backend
node scripts/add-expenses-table.js
```

4. **Verify the output**:
```
Connected to database
✓ Created expenses table
✓ Created indexes
✅ Expenses table created successfully!
```

5. **Revert your `.env` file** back to local database settings

### Option B: Using Render PostgreSQL Dashboard

1. Go to Render Dashboard → `paint-inventory-db`
2. Click "Connect" → "External Connection"
3. Use the connection details to connect via `psql` or a database client
4. Run the SQL from `backend/scripts/add-expenses-table.js` (lines 30-61)

---

## Step 2: Add Environment Variables to Render

Go to Render Dashboard → `paint-inventory-api` → Environment

Add the following environment variables:

### IMAP Configuration (for reading emails)

| Variable         | Value                  | Notes                                     |
| ---------------- | ---------------------- | ----------------------------------------- |
| `IMAP_HOST`      | `imap.gmail.com`       | Gmail IMAP server                         |
| `IMAP_PORT`      | `993`                  | IMAP SSL port                             |
| `IMAP_USER`      | `c.matson11@gmail.com` | Your Gmail address                        |
| `IMAP_PASSWORD`  | `pxzwsqxcibewrvvk`     | Gmail app password (same as EMAIL_PASSWORD) |
| `SUPPLIER_EMAIL` | `AR@spectrumpaint.com` | Email address to monitor for invoices     |

**Note**: If you already have `EMAIL_USER` and `EMAIL_PASSWORD` set for SMTP, the IMAP service will fall back to those if `IMAP_USER` and `IMAP_PASSWORD` are not set. However, it's clearer to set them explicitly.

### Steps to Add Variables:

1. Click "Add Environment Variable"
2. Enter the key and value
3. Click "Save"
4. Repeat for all variables above
5. Click "Save Changes" at the bottom

**Important**: After adding environment variables, Render will automatically redeploy your backend service.

---

## Step 3: Deploy Code Changes to Production

### 3.1 Review Your Changes

Check what's been modified:

```bash
git status
```

You should see:
- Modified: `backend/services/emailMonitorService.js`
- Modified: `backend/.env` (don't commit this!)
- Modified: `docs/environment-variables-guide.md`
- New: `backend/scripts/test-email-monitor.js`
- New: Various expense-related files

### 3.2 Commit and Push Changes

```bash
# Make sure you're in the backend directory
cd backend

# Add the changes (but not .env!)
git add services/emailMonitorService.js
git add scripts/test-email-monitor.js
git add scripts/add-expenses-table.js
git add graphql/resolvers/expenses.js
git add graphql/resolvers/index.js
git add graphql/schema/typeDefs.js

# Commit the changes
git commit -m "Add expenses tracking and automated invoice email monitoring

- Add expenses table and GraphQL schema
- Implement email monitoring service with IMAP
- Add PDF parser for Spectrum Paint invoices
- Add cron job for automated email monitoring every 30 minutes
- Update environment variables to separate SMTP and IMAP configs
- Add test script for email monitoring"

# Push to GitHub
git push origin expenses-importing
```

### 3.3 Merge to Main Branch (if needed)

If your production deploys from `main`:

```bash
git checkout main
git merge expenses-importing
git push origin main
```

### 3.4 Verify Deployment on Render

1. Go to Render Dashboard → `paint-inventory-api`
2. Click "Logs" tab
3. Wait for deployment to complete
4. Look for: "Build successful" and "Live"

---

## Step 4: Test Email Monitoring on Production

### 4.1 Check Cron Job Logs

Monitor the logs for the cron job:

1. Go to Render Dashboard → `paint-inventory-api` → Logs
2. Wait for the next 30-minute mark (e.g., 2:00 PM, 2:30 PM, etc.)
3. Look for:
   ```
   [CRON] Running invoice email monitor job
   [EMAIL] Connecting to imap.gmail.com:993
   [EMAIL] Looking for emails from: AR@spectrumpaint.com
   [EMAIL] Connected to email server
   ```

### 4.2 Test Manually (Optional)

You can SSH into your Render service and run the test script:

1. Go to Render Dashboard → `paint-inventory-api` → Shell
2. Run:
   ```bash
   node scripts/test-email-monitor.js
   ```

### 4.3 Verify Expense Records

Check that expenses are being created:

1. Go to your GraphQL playground: `https://paint-inventory-api.onrender.com/graphql`
2. Run this query:
   ```graphql
   query {
     expenses(limit: 10) {
       id
       vendor
       invoice_number
       invoice_date
       total
       status
       created_at
     }
   }
   ```

3. You should see the imported expenses from email

---

## Step 5: Monitor and Verify

### Check Email Processing

1. Monitor Render logs for the next few cron runs
2. Verify emails are being processed and marked as read
3. Check that PDFs are being parsed correctly
4. Confirm expense records are being created in the database

### Troubleshooting

If you see errors:

1. **"Timed out while authenticating"**
   - Verify IMAP environment variables are set correctly
   - Check that IMAP_HOST is `imap.gmail.com` (not smtp.gmail.com)
   - Verify IMAP_PORT is `993`

2. **"Missing email credentials"**
   - Verify IMAP_USER and IMAP_PASSWORD are set in Render
   - Or verify EMAIL_USER and EMAIL_PASSWORD are set (fallback)

3. **Database connection errors**
   - Verify DATABASE_URL is set correctly
   - Check that the expenses table exists

4. **PDF parsing errors**
   - Check the logs for specific PDF parsing errors
   - Verify the PDF format matches expected Spectrum Paint format

---

## Rollback Plan

If something goes wrong:

1. **Disable the cron job** temporarily:
   - Comment out the email monitoring cron in `cronService.js`
   - Redeploy

2. **Revert code changes**:
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

3. **Remove environment variables**:
   - Go to Render → Environment
   - Remove IMAP_* variables

---

## Success Criteria

- [x] Expenses table created in production database
- [x] IMAP environment variables added to Render
- [x] Code deployed to production
- [x] Cron job running every 30 minutes without errors
- [x] Emails being processed and marked as read
- [x] Expense records being created in database
- [x] No authentication timeouts in logs

---

## Next Steps

After successful deployment:

1. Monitor logs for the first 24 hours
2. Verify all incoming invoices are being processed
3. Check for any duplicate expense records
4. Review and approve pending expenses in the UI
5. Consider adding alerts for failed email processing

---

## Additional Notes

### File Locations

- PDFs are saved to: `/imports/materials-invoices/processed/`
- Duplicates moved to: `/imports/materials-invoices/duplicates/`
- Errors moved to: `/imports/materials-invoices/errors/`

### Cron Schedule

- Invoice email monitoring: Every 30 minutes (`*/30 * * * *`)
- Overdue invoices check: Daily at midnight (`0 0 * * *`)

### Gmail Settings

Make sure IMAP is enabled in Gmail:
1. Go to Gmail Settings → Forwarding and POP/IMAP
2. Enable IMAP
3. Save changes
