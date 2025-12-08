import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { query } from '../config/database.js';

const importServices = async (csvFilePath) => {
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

    console.log(`📊 Found ${records.length} services to import`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const record of records) {
      try {
        // Map QuickBooks CSV columns to database fields
        const name = record['Name'] || record['Product/Service'] || record['Item'] || record['Service'];
        const description = record['Description'] || record['Sales Description'] || record['Details'] || '';
        const cost = parseFloat(record['Rate'] || record['Price'] || record['Cost'] || record['Sales Price'] || 0);

        if (!name) {
          console.log(`⚠️  Skipping row - no service name found`);
          skipped++;
          continue;
        }

        // Allow $0 cost since pricing can vary by job
        const serviceCost = cost || 0;

        // Check if service already exists
        const existing = await query(
          'SELECT id FROM services WHERE name = $1',
          [name]
        );

        if (existing.rows.length > 0) {
          console.log(`⏭️  Skipping "${name}" - already exists`);
          skipped++;
          continue;
        }

        // Insert service
        await query(
          `INSERT INTO services (name, description, cost)
           VALUES ($1, $2, $3)`,
          [name, description || null, serviceCost]
        );

        console.log(`✅ Imported: ${name} ($${serviceCost.toFixed(2)})`);
        imported++;
      } catch (error) {
        console.error(`❌ Error importing service:`, error.message);
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
  console.log('Usage: node scripts/import-services.js /path/to/services.csv');
  console.log('\nHow to export from QuickBooks:');
  console.log('1. Go to Settings > Products and Services');
  console.log('2. Click "Export" button');
  console.log('3. Save as CSV');
  console.log('4. Run this script with the exported CSV file');
  process.exit(1);
}

if (!fs.existsSync(csvFilePath)) {
  console.error(`❌ File not found: ${csvFilePath}`);
  process.exit(1);
}

importServices(csvFilePath);
