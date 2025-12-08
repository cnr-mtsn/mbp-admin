import fs from 'fs';
import XLSX from 'xlsx';
import { query } from '../config/database.js';

const importCustomers = async (filePath) => {
  try {
    console.log('📂 Reading Excel file...');

    // Read the Excel file
    const workbook = XLSX.readFile(filePath);

    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const records = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📊 Found ${records.length} customers to import`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const record of records) {
      try {
        // Map your Excel columns to database fields
        // Adjust these column names based on your QuickBooks export
        const name = record['Name'] || record['Customer'] || record['DisplayName'] || record['Customer Name'];
        const company_name = record['Company'] || record['Company Name'] || record['Business Name'];
        const email = record['Email'] || record['PrimaryEmail'] || record['Main Email'];
        const phone = record['Phone'] || record['PrimaryPhone'] || record['PhoneNumber'] || record['Main Phone'];
        const address = record['Address'] || record['BillAddr Line1'] || record['Billing Street'];
        const city = record['City'] || record['BillAddr City'] || record['Billing City'];
        const state = record['State'] || record['BillAddr State'] || record['Billing State/Province'];
        const zip = record['ZIP'] || record['Zip'] || record['BillAddr PostalCode'] || record['Billing Zip'];

        if (!name) {
          console.log(`⚠️  Skipping row - no name found. Available columns: ${Object.keys(record).join(', ')}`);
          skipped++;
          continue;
        }

        // Check if customer already exists
        const existing = await query(
          'SELECT id FROM customers WHERE name = $1',
          [name]
        );

        if (existing.rows.length > 0) {
          console.log(`⏭️  Skipping "${name}" - already exists`);
          skipped++;
          continue;
        }

        // Insert customer
        await query(
          `INSERT INTO customers (name, company_name, email, phone, address, city, state, zip)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [name, company_name || null, email || null, phone || null, address || null, city || null, state || null, zip || null]
        );

        console.log(`✅ Imported: ${name}`);
        imported++;
      } catch (error) {
        console.error(`❌ Error importing customer:`, error.message);
        errors++;
      }
    }

    console.log('\n📈 Import Summary:');
    console.log(`   ✅ Imported: ${imported}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📊 Total: ${records.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
};

// Get file path from command line argument
const filePath = process.argv[2];

if (!filePath) {
  console.error('❌ Please provide an Excel file path');
  console.log('Usage: node scripts/import-customers-xls.js /path/to/customers.xls');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`❌ File not found: ${filePath}`);
  process.exit(1);
}

importCustomers(filePath);
