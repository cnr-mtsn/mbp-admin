import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');
const pdfParse = PDFParse;

/**
 * Parse Spectrum Paint invoice PDF
 * @param {string} pdfPath - Path to PDF file
 * @returns {Object} - Parsed invoice data
 */
export async function parseSpectrumPaintInvoice(pdfPath) {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const parser = new pdfParse({ data: dataBuffer });
    const result = await parser.getText();
    const text = result.text;

    // Extract invoice data using regex patterns
    const invoiceNumber = extractInvoiceNumber(text);
    const invoiceDate = extractInvoiceDate(text);
    const poNumber = extractPONumber(text);
    const lineItems = extractLineItems(text);
    const subtotal = extractSubtotal(text);
    const tax = extractTax(text);
    const total = extractTotal(text);

    return {
      vendor: 'Spectrum Paint',
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      po_number: poNumber,
      line_items: lineItems,
      subtotal: subtotal,
      tax: tax,
      total: total,
      description: lineItems.map(item => item.description).join(', '),
      expense_type: 'materials',
      status: 'pending_review'
    };
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw error;
  }
}

function extractInvoiceNumber(text) {
  // Match "Ref #:115010945" or variations
  const match = text.match(/Ref\s*#?\s*:?\s*(\d+)/i);
  return match ? match[1] : null;
}

function extractInvoiceDate(text) {
  // Match MM/DD/YY or MM/DD/YYYY format - look for date near "INVOICE"
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.includes('INVOICE')) {
      const dateMatch = line.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
      if (dateMatch) {
        const [_, month, day, year] = dateMatch;
        const fullYear = year.length === 2 ? `20${year}` : year;
        return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
  }
  return null;
}

function extractPONumber(text) {
  // Match "PO#:DAVENPORT" or variations
  const match = text.match(/PO#?\s*:?\s*([A-Z0-9\-]+)/i);
  return match ? match[1].trim() : null;
}

function extractLineItems(text) {
  const lineItems = [];
  const lines = text.split('\n');

  // Find lines that look like items (have quantity, description, and amounts)
  // Pattern: "1 1 I 0 PSC 22045PS GAL DENATURED ALCOHOL 17.97 17.97"
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines and header lines
    if (!line || line.includes('Ord Shp') || line.includes('Total Shipped')) {
      continue;
    }

    // Match line items pattern - numbers at start and end
    // Looking for pattern: quantity ... description ... unit_price amount
    const itemMatch = line.match(/^(\d+)\s+\d+.*?([A-Z].+?)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)$/);
    if (itemMatch) {
      const quantity = parseInt(itemMatch[1]);
      const description = itemMatch[2].trim().replace(/\s+/g, ' ');
      const unitPrice = parseFloat(itemMatch[3].replace(/,/g, ''));
      const amount = parseFloat(itemMatch[4].replace(/,/g, ''));

      // Only add if we have valid data
      if (description && !isNaN(amount)) {
        lineItems.push({
          description: description,
          quantity: quantity || 1,
          unit_price: unitPrice || amount,
          amount: amount
        });
      }
    }
  }

  return lineItems;
}

function extractSubtotal(text) {
  // Match "Sub-Total: 17.97" or "Tax Sub-Total: 17.97"
  const match = text.match(/Sub-?Total\s*:?\s*\$?([\d,]+\.?\d*)/i);
  if (match) {
    return parseFloat(match[1].replace(/,/g, ''));
  }
  return null;
}

function extractTax(text) {
  // Match "Tax" line with amount, but not "Tax Sub-Total"
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.includes('Tax') && !line.includes('Sub-Total')) {
      const match = line.match(/\$?([\d,]+\.?\d*)/);
      if (match) {
        return parseFloat(match[1].replace(/,/g, ''));
      }
    }
  }
  return null;
}

function extractTotal(text) {
  // Match "Grand Total: 19.54"
  const match = text.match(/Grand\s*Total\s*:?\s*\$?([\d,]+\.?\d*)/i);
  if (match) {
    return parseFloat(match[1].replace(/,/g, ''));
  }

  // Fallback: look for "Total Shipped:" line and get the last number
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.includes('Total Shipped')) {
      const numbers = line.match(/\$?([\d,]+\.?\d*)/g);
      if (numbers && numbers.length > 0) {
        const lastNumber = numbers[numbers.length - 1];
        return parseFloat(lastNumber.replace(/[$,]/g, ''));
      }
    }
  }

  return null;
}

/**
 * Generic PDF parser for other invoice formats
 * @param {string} pdfPath - Path to PDF file
 * @returns {Object} - Basic extracted data
 */
export async function parseGenericInvoice(pdfPath) {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const parser = new pdfParse({ data: dataBuffer });
    const result = await parser.getText();
    const text = result.text;

    // Try to extract basic info
    const total = extractTotal(text) || extractSubtotal(text);

    return {
      vendor: 'Unknown Vendor',
      invoice_number: null,
      invoice_date: null,
      po_number: null,
      line_items: [],
      subtotal: null,
      tax: null,
      total: total,
      description: 'Invoice - manual review required',
      expense_type: 'materials',
      status: 'pending_review'
    };
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw error;
  }
}
