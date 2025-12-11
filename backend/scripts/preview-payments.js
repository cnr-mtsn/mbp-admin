import XLSX from 'xlsx';

const filePath = process.argv[2] || 'all-payments.xlsx';

const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const records = XLSX.utils.sheet_to_json(worksheet);

console.log(`Total rows: ${records.length}`);
console.log(`\nColumns: ${Object.keys(records[0] || {}).join(', ')}`);
console.log('\nFirst 15 rows:');
records.slice(0, 15).forEach((row, i) => {
  console.log(`\nRow ${i}:`, JSON.stringify(row, null, 2));
});
