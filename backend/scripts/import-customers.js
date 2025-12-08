import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { query } from '../config/database.js';

const importCustomers = async (csvFilePath) => {
  try {
    console.log('📂 Reading CSV file...');

    // Read the CSV file
    const fileContent = fs.readFileSync(csvFilePath, 'utf-8');

    // Parse CSV
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    console.log(`📊 Found ${records.length} customers to import`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const record of records) {
      try {
        // Map your CSV columns to database fields
        // Adjust these column names based on your QuickBooks export
        const name = record['Name'] || record['Customer'] || record['DisplayName'];
        const email = record['Email'] || record['PrimaryEmail'];
        const phone = record['Phone'] || record['PrimaryPhone'] || record['PhoneNumber'];
        const address = record['Address'] || record['BillAddr Line1'];
        const city = record['City'] || record['BillAddr City'];
        const state = record['State'] || record['BillAddr State'];
        const zip = record['ZIP'] || record['Zip'] || record['BillAddr PostalCode'];

        if (!name) {
          console.log(`⚠️  Skipping row - no name found`);
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
          `INSERT INTO customers (name, email, phone, address, city, state, zip)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [name, email, phone, address, city, state, zip]
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

// Get CSV file path from command line argument
const csvFilePath = process.argv[2];

if (!csvFilePath) {
  console.error('❌ Please provide a CSV file path');
  console.log('Usage: node scripts/import-customers.js /path/to/customers.csv');
  process.exit(1);
}

if (!fs.existsSync(csvFilePath)) {
  console.error(`❌ File not found: ${csvFilePath}`);
  process.exit(1);
}

importCustomers(csvFilePath);
