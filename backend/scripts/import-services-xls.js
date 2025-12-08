import fs from 'fs';
import XLSX from 'xlsx';
import { query } from '../config/database.js';

const importServices = async (filePath) => {
  try {
    console.log('📂 Reading Excel file...');

    // Read the Excel file
    const workbook = XLSX.readFile(filePath);

    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const records = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📊 Found ${records.length} services to import`);
    console.log(`📋 Available columns: ${Object.keys(records[0] || {}).join(', ')}`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const record of records) {
      try {
        // Map QuickBooks Excel columns to database fields
        const name = record['Name'] || record['Product/Service'] || record['Item'] || record['Service'] || record['Product'];
        const description = record['Description'] || record['Sales Description'] || record['Sales Desc/Name'] || record['Details'] || '';
        const cost = parseFloat(
          record['Rate'] ||
          record['Price'] ||
          record['Cost'] ||
          record['Sales Price'] ||
          record['Sales Price/Rate'] ||
          0
        );

        if (!name) {
          console.log(`⚠️  Skipping row - no service name found. Available columns: ${Object.keys(record).join(', ')}`);
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
        console.error(`   Row data:`, JSON.stringify(record, null, 2));
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
    console.error(error.stack);
    process.exit(1);
  }
};

// Get file path from command line argument
const filePath = process.argv[2];

if (!filePath) {
  console.error('❌ Please provide an Excel file path');
  console.log('Usage: node scripts/import-services-xls.js /path/to/services.xlsx');
  console.log('\nHow to export from QuickBooks:');
  console.log('1. Go to Settings > Products and Services');
  console.log('2. Click "Export" or use Reports > Product/Service List');
  console.log('3. Export as Excel (.xlsx or .xls)');
  console.log('4. Run this script with the exported Excel file');
  console.log('\n💡 Tips:');
  console.log('- Each service must have a name');
  console.log('- Duplicate names will be skipped');
  console.log('- Services with $0 cost are allowed (pricing can vary by job)');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`❌ File not found: ${filePath}`);
  process.exit(1);
}

importServices(filePath);
