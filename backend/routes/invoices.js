import express from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import { extractUuidForQuery } from '../utils/resolverHelpers.js';

const router = express.Router();

// Custom auth middleware for PDF endpoint that accepts token from query params
const authenticatePdfRequest = (req, res, next) => {
  const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// PDF Preview endpoint - returns binary PDF data
router.get('/:id/preview-pdf', authenticatePdfRequest, async (req, res) => {
  try {
    const { id } = req.params;
    // Decode the URL-encoded GID
    const decodedId = decodeURIComponent(id);
    const hexPrefix = extractUuidForQuery(decodedId);

    // Fetch invoice with customer information
    const result = await query(
      `SELECT i.*, c.name as customer_name, c.email as customer_email,
              c.phone as customer_phone, c.address as customer_address,
              j.title as job_title
       FROM invoices i
       LEFT JOIN customers c ON i.customer_id = c.id
       LEFT JOIN jobs j ON i.job_id = j.id
       WHERE REPLACE(i.id::text, '-', '') LIKE $1`,
      [`${hexPrefix}%`]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = result.rows[0];

    // Dynamic import to load the PDF service
    const { generateInvoicePDF } = await import('../services/pdfService.js');

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(invoice);

    // Set headers for PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${invoice.invoice_number || invoice.id}.pdf"`);

    res.send(pdfBuffer);
  } catch (error) {
    console.error('Preview PDF error:', error);
    res.status(500).json({ error: error.message || 'Failed to preview PDF' });
  }
});

export default router;
