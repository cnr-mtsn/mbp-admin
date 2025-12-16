import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateInvoicePDF } from '../services/pdfService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sampleInvoice = {
  invoice_number: 'INV-TEST-001',
  title: 'Sample Project - Interior/Exterior Paint',
  description: 'Full prep, prime, and paint for main floor and exterior trim.',
  customer_name: 'Jane Customer',
  company_name: 'Customer Co.',
  customer_email: 'jane.customer@example.com',
  customer_phone: '555-123-4567',
  customer_address: '123 Main St\nSpringfield, MO 65807',
  created_at: Date.now(),
  due_date: Date.now() + 7 * 24 * 60 * 60 * 1000,
  line_items: [
    { description: 'Prep and paint - interior', quantity: 1, rate: 1200, amount: 1200 },
    { description: 'Exterior trim repaint', quantity: 1, rate: 950, amount: 950 },
    { description: 'Materials', quantity: 1, rate: 180, amount: 180 },
  ],
  subtotal: 2330,
  tax: 0,
  total: 2330,
  status: 'pending',
  payment_stage: 'touchup',
  percentage: 10,
  notes: 'Includes minor patching and caulking. Please contact us if you need schedule adjustments.',
};

const outputPath = path.resolve(__dirname, '..', 'preview-invoice.pdf');

const run = async () => {
  try {
    const pdfBuffer = await generateInvoicePDF(sampleInvoice);
    await fs.promises.writeFile(outputPath, pdfBuffer);
    console.log(`Saved preview PDF to ${outputPath}`);
  } catch (err) {
    console.error('Failed to generate preview invoice PDF:', err);
    process.exitCode = 1;
  }
};

run();
