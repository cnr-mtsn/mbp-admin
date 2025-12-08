# QuickBooks Data Import Guide

This guide explains how to export data from QuickBooks and import it into your Matson Bros database.

## Prerequisites

- Make sure your backend server is running
- Recommended import order:
  1. **Customers** (required before invoices)
  2. **Services** (optional - will be auto-created during invoice import)
  3. **Invoices**

## Step 1: Export Services from QuickBooks (Optional)

Services (Products & Services in QuickBooks) are the line items that appear on invoices and estimates. You can either:
- Import them first from QuickBooks, OR
- Let them be auto-created during invoice import

### Export Services from QuickBooks

1. Go to **Settings** > **Products and Services**
2. Click the **Export** button
3. Choose **Export to CSV** or **Export to Excel**
4. Save the file to your computer

### Import Services

**For CSV files:**
```bash
cd /Users/cnrmtsn/Development/matson-bros/backend
node scripts/import-services.js /path/to/services.csv
```

**For Excel files:**
```bash
cd /Users/cnrmtsn/Development/matson-bros/backend
node scripts/import-services-xls.js /path/to/services.xlsx
```

## Step 2: Export Invoices from QuickBooks

### Option A: Export as CSV

1. Open QuickBooks Online
2. Go to **Sales** > **Invoices** (or **Reports** > **Custom Reports**)
3. Select the date range for the invoices you want to export
4. Click **Export** button
5. Choose **Export to CSV** or **Export to Excel**
6. Save the file to your computer

### Option B: Export as Excel

1. Open QuickBooks Online
2. Go to **Reports** > **Custom Reports**
3. Search for "Transaction List by Customer" or "Invoice List"
4. Filter to show only invoices
5. Select the date range
6. Click **Export** and choose **Export to Excel**
7. Save the file to your computer

### Common QuickBooks Export Columns

The import scripts are designed to handle various QuickBooks export formats. Common column names include:

- **Invoice Number**: `Num`, `Invoice Number`, `DocNumber`, `Invoice #`
- **Customer**: `Customer`, `Customer Name`, `CustomerRef`, `Customer:Job`
- **Date**: `Invoice Date`, `TxnDate`, `Date`, `Transaction Date`
- **Amount**: `Total`, `Balance`, `Amount`, `Open Balance`
- **Status**: `Paid`, `Status`
- **Due Date**: `Due Date`, `DueDate`

## Step 3: Import Invoices

### Using CSV Files

```bash
cd /Users/cnrmtsn/Development/matson-bros/backend
node scripts/import-invoices.js /path/to/your/invoices.csv
```

### Using Excel Files (.xlsx or .xls)

```bash
cd /Users/cnrmtsn/Development/matson-bros/backend
node scripts/import-invoices-xls.js /path/to/your/invoices.xlsx
```

## Import Process

### Services Import

The services import script will:
1. ✅ Read the file and parse all service records
2. ✅ Skip services that already exist (by name)
3. ✅ Skip services with no cost/rate
4. ✅ Create new service records with name, description, and cost

### Invoice Import

The invoice import script will:
1. ✅ Read the file and parse all invoice records
2. ✅ Match customers by name (case-insensitive)
3. ✅ Skip invoices that already exist (by invoice number)
4. ✅ Skip invoices for customers not found in database
5. ✅ Parse dates, amounts, and status
6. ✅ **Auto-create services** from line items if they don't exist
7. ✅ Link line items to services with quantity and rates
8. ✅ Show detailed progress and summary

## Import Summary

After the import completes, you'll see a summary like this:

```
📈 Import Summary:
   ✅ Imported: 45
   ⏭️  Skipped: 5
   ❌ Errors: 0
   📊 Total: 50
```

## Troubleshooting

### "Customer not found"

If you see this error, it means:
- The customer hasn't been imported yet → Import customers first
- The customer name doesn't match exactly → Check spelling in both systems
- The customer might be listed under company name → Script checks both name and company_name

### "Invoice already exists"

This means an invoice with that invoice number already exists in the database. The script will skip it to avoid duplicates.

### Column Name Mismatches

If the script can't find required fields, check the CSV/Excel file and verify column names. You may need to:
1. Look at the available columns shown in the error message
2. Update the import script to match your QuickBooks export format
3. Contact support for help with custom column mappings

## Data Mapping

### Services Table

| QuickBooks Field | Database Field | Notes |
|-----------------|----------------|-------|
| Name / Product/Service | name | Unique identifier |
| Description | description | Optional |
| Rate / Price | cost | Cost per unit |

### Invoices Table

| QuickBooks Field | Database Field | Notes |
|-----------------|----------------|-------|
| Invoice Number | invoice_number | Must be unique |
| Customer Name | customer_id | Matched by name lookup |
| Invoice Date | created_at | Parsed as date |
| Due Date | due_date | Parsed as date |
| Subtotal | subtotal | Numeric |
| Tax | tax | Numeric |
| Total | total | Numeric |
| Status/Paid | status | 'paid', 'unpaid', or 'partial' |
| Paid Date | paid_date | Parsed as date |
| Payment Method | payment_method | Text |
| Memo/Description | description | Text |
| Notes | notes | Text |
| Item Description | line_items | JSON array with service_id references |

### Line Items Structure

Line items in invoices are stored as JSONB with the following structure:
```json
[
  {
    "service_id": "uuid-here",
    "service_name": "Interior Painting",
    "quantity": 10,
    "rate": 50.00,
    "amount": 500.00
  }
]
```

## Next Steps

After importing invoices, you can:

1. View them in the billing app at http://localhost:5174/invoices
2. Link invoices to jobs (if needed)
3. Link invoices to estimates (if needed)
4. Update invoice status as needed

## Additional Import Scripts

### Import Customers

```bash
# CSV format
node scripts/import-customers.js /path/to/customers.csv

# Excel format
node scripts/import-customers-xls.js /path/to/customers.xlsx
```

### Import Services

```bash
# CSV format
node scripts/import-services.js /path/to/services.csv

# Excel format
node scripts/import-services-xls.js /path/to/services.xlsx
```

**Note:** Services will be automatically created during invoice import if they don't exist, so importing services separately is optional but recommended for better control over service names and descriptions.

## Need Help?

If you encounter issues:
1. Check that column names match expected formats
2. Verify customers are imported first
3. Look at the error messages for specific issues
4. Check the database connection is working
