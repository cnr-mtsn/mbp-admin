import Imap from 'imap';
import { simpleParser } from 'mailparser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseSpectrumPaintInvoice } from './pdfParserService.js';
import { query } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Email configuration
const EMAIL_CONFIG = {
  user: process.env.IMAP_USER || process.env.EMAIL_USER,
  password: process.env.IMAP_PASSWORD || process.env.EMAIL_PASSWORD,
  host: process.env.IMAP_HOST || 'imap.gmail.com',
  port: parseInt(process.env.IMAP_PORT) || 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
};

const SUPPLIER_EMAIL = process.env.SUPPLIER_EMAIL || 'AR@spectrumpaint.com';

// Directory paths
const BASE_DIR = path.join(__dirname, '../../imports/materials-invoices');
const PENDING_DIR = path.join(BASE_DIR, 'pending');
const PROCESSED_DIR = path.join(BASE_DIR, 'processed');
const DUPLICATES_DIR = path.join(BASE_DIR, 'duplicates');
const ERRORS_DIR = path.join(BASE_DIR, 'errors');

/**
 * Ensure all required directories exist
 */
function ensureDirectories() {
  [BASE_DIR, PENDING_DIR, PROCESSED_DIR, DUPLICATES_DIR, ERRORS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`[EMAIL] Created directory: ${dir}`);
    }
  });
}

/**
 * Check if an expense with this vendor and invoice number already exists
 */
async function isDuplicateInvoice(vendor, invoiceNumber) {
  try {
    const result = await query(
      `SELECT id FROM expenses WHERE vendor = $1 AND invoice_number = $2 LIMIT 1`,
      [vendor, invoiceNumber]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('[EMAIL] Error checking for duplicate invoice:', error);
    return false;
  }
}

/**
 * Create expense record in database
 */
async function createExpenseRecord(parsedData, pdfPath) {
  try {
    const result = await query(
      `INSERT INTO expenses (
        expense_type, vendor, invoice_number, invoice_date, po_number,
        description, line_items, subtotal, tax, total, pdf_path, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id`,
      [
        parsedData.expense_type || 'materials',
        parsedData.vendor,
        parsedData.invoice_number,
        parsedData.invoice_date,
        parsedData.po_number,
        parsedData.description,
        JSON.stringify(parsedData.line_items || []),
        parsedData.subtotal,
        parsedData.tax,
        parsedData.total,
        pdfPath,
        parsedData.status || 'pending_review'
      ]
    );

    const expenseId = result.rows[0].id;
    console.log(`[EMAIL] Created expense record: ${expenseId}`);
    return expenseId;
  } catch (error) {
    console.error('[EMAIL] Error creating expense record:', error);
    throw error;
  }
}

/**
 * Process a single PDF attachment
 */
async function processPdfAttachment(attachment, filename) {
  const timestamp = Date.now();
  const safeFilename = `${timestamp}_${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const pendingPath = path.join(PENDING_DIR, safeFilename);

  try {
    // Save PDF to pending directory
    fs.writeFileSync(pendingPath, attachment.content);
    console.log(`[EMAIL] Saved PDF: ${safeFilename}`);

    // Parse the PDF
    const parsedData = await parseSpectrumPaintInvoice(pendingPath);
    console.log(`[EMAIL] Parsed invoice: ${parsedData.invoice_number}`);

    // Check for duplicates
    if (await isDuplicateInvoice(parsedData.vendor, parsedData.invoice_number)) {
      console.log(`[EMAIL] Duplicate invoice detected: ${parsedData.invoice_number}`);
      const duplicatePath = path.join(DUPLICATES_DIR, safeFilename);
      fs.renameSync(pendingPath, duplicatePath);
      return { status: 'duplicate', invoice_number: parsedData.invoice_number };
    }

    // Create expense record
    const relativePathForDb = `imports/materials-invoices/processed/${safeFilename}`;
    const expenseId = await createExpenseRecord(parsedData, relativePathForDb);

    // Move to processed directory
    const processedPath = path.join(PROCESSED_DIR, safeFilename);
    fs.renameSync(pendingPath, processedPath);
    console.log(`[EMAIL] Moved to processed: ${safeFilename}`);

    return {
      status: 'success',
      expense_id: expenseId,
      invoice_number: parsedData.invoice_number,
      total: parsedData.total
    };
  } catch (error) {
    console.error(`[EMAIL] Error processing PDF ${filename}:`, error);

    // Move to errors directory
    if (fs.existsSync(pendingPath)) {
      const errorPath = path.join(ERRORS_DIR, safeFilename);
      fs.renameSync(pendingPath, errorPath);
      console.log(`[EMAIL] Moved to errors: ${safeFilename}`);
    }

    return {
      status: 'error',
      error: error.message
    };
  }
}

/**
 * Process a single email message
 */
async function processEmail(messageSeqno, imap) {
  return new Promise((resolve, reject) => {
    const fetch = imap.fetch(messageSeqno, {
      bodies: '',
      markSeen: false
    });

    fetch.on('message', (msg) => {
      msg.on('body', async (stream) => {
        try {
          const parsed = await simpleParser(stream);
          const from = parsed.from?.text || '';

          console.log(`[EMAIL] Processing email from: ${from}`);
          console.log(`[EMAIL] Subject: ${parsed.subject}`);

          // Check if email is from supplier
          if (!from.toLowerCase().includes(SUPPLIER_EMAIL.toLowerCase())) {
            console.log(`[EMAIL] Email not from supplier, skipping`);
            resolve({ status: 'skipped', reason: 'not_from_supplier' });
            return;
          }

          // Process PDF attachments
          const results = [];
          if (parsed.attachments && parsed.attachments.length > 0) {
            for (const attachment of parsed.attachments) {
              if (attachment.contentType === 'application/pdf') {
                console.log(`[EMAIL] Found PDF attachment: ${attachment.filename}`);
                const result = await processPdfAttachment(attachment, attachment.filename);
                results.push(result);
              }
            }
          } else {
            console.log(`[EMAIL] No PDF attachments found`);
            resolve({ status: 'skipped', reason: 'no_pdf_attachments' });
            return;
          }

          // Mark email as read if processing was successful
          if (results.some(r => r.status === 'success')) {
            imap.setFlags(messageSeqno, ['\\Seen'], (err) => {
              if (err) {
                console.error('[EMAIL] Error marking email as read:', err);
              } else {
                console.log('[EMAIL] Marked email as read');
              }
            });
          }

          resolve({ status: 'processed', results });
        } catch (error) {
          console.error('[EMAIL] Error parsing email:', error);
          reject(error);
        }
      });
    });

    fetch.once('error', (err) => {
      console.error('[EMAIL] Fetch error:', err);
      reject(err);
    });
  });
}

/**
 * Monitor email inbox for new invoices
 */
export async function monitorInvoiceEmails() {
  // Ensure directories exist
  ensureDirectories();

  // Validate email configuration
  if (!EMAIL_CONFIG.user || !EMAIL_CONFIG.password) {
    console.error('[EMAIL] Missing email credentials in environment variables');
    console.error('[EMAIL] Required: EMAIL_USER, EMAIL_PASSWORD');
    return { status: 'error', error: 'Missing email credentials' };
  }

  console.log(`[EMAIL] Connecting to ${EMAIL_CONFIG.host}:${EMAIL_CONFIG.port}`);
  console.log(`[EMAIL] Looking for emails from: ${SUPPLIER_EMAIL}`);

  return new Promise((resolve, reject) => {
    const imap = new Imap(EMAIL_CONFIG);
    let processed = [];

    imap.once('ready', () => {
      console.log('[EMAIL] Connected to email server');

      imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          console.error('[EMAIL] Error opening inbox:', err);
          imap.end();
          reject(err);
          return;
        }

        console.log(`[EMAIL] Opened inbox (${box.messages.total} total messages)`);

        // Search for unread emails from supplier
        imap.search(['UNSEEN', ['FROM', SUPPLIER_EMAIL]], async (err, results) => {
          if (err) {
            console.error('[EMAIL] Search error:', err);
            imap.end();
            reject(err);
            return;
          }

          if (!results || results.length === 0) {
            console.log('[EMAIL] No unread emails from supplier found');
            imap.end();
            resolve({ status: 'success', processed: 0, messages: [] });
            return;
          }

          console.log(`[EMAIL] Found ${results.length} unread email(s) from supplier`);

          // Process each email
          try {
            for (const messageSeqno of results) {
              const result = await processEmail(messageSeqno, imap);
              processed.push(result);
            }

            imap.end();
            resolve({
              status: 'success',
              processed: processed.length,
              messages: processed
            });
          } catch (error) {
            console.error('[EMAIL] Error processing emails:', error);
            imap.end();
            reject(error);
          }
        });
      });
    });

    imap.once('error', (err) => {
      console.error('[EMAIL] IMAP connection error:', err);
      reject(err);
    });

    imap.once('end', () => {
      console.log('[EMAIL] Connection ended');
    });

    imap.connect();
  });
}

/**
 * Test email connection (for debugging)
 */
export async function testEmailConnection() {
  return new Promise((resolve, reject) => {
    const imap = new Imap(EMAIL_CONFIG);

    imap.once('ready', () => {
      console.log('[EMAIL TEST] ✅ Successfully connected to email server');
      imap.end();
      resolve({ status: 'success', message: 'Connected successfully' });
    });

    imap.once('error', (err) => {
      console.error('[EMAIL TEST] ❌ Connection failed:', err.message);
      reject({ status: 'error', error: err.message });
    });

    imap.connect();
  });
}
