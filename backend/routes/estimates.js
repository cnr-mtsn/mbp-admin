import express from 'express';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { toGidFormat, extractUuidForQuery, toGidFormatArray } from '../utils/resolverHelpers.js';
import { generateEstimatePDF } from '../services/pdfService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// ==========================================
// PUBLIC ROUTES (No authentication required)
// These MUST come BEFORE router.use(authenticateToken)
// ==========================================

// PDF Preview endpoint
router.get('/:id/preview-pdf', authenticatePdfRequest, async (req, res) => {
  try {
    const { id } = req.params;
    const hexPrefix = extractUuidForQuery(id);

    // Get estimate with customer data
    const estimateResult = await query(
      `SELECT e.*, c.name as customer_name, c.company_name, c.email as customer_email,
              c.phone as customer_phone, c.address as customer_address
       FROM estimates e
       LEFT JOIN customers c ON e.customer_id = c.id
       WHERE REPLACE(e.id::text, '-', '') LIKE $1`,
      [`${hexPrefix}%`]
    );

    if (estimateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Estimate not found' });
    }

    const estimate = estimateResult.rows[0];
    estimate.line_items = typeof estimate.line_items === 'string'
      ? JSON.parse(estimate.line_items)
      : estimate.line_items;

    // Generate PDF
    const pdfBuffer = await generateEstimatePDF(estimate);

    // Set headers for PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=estimate-${estimate.id.slice(0, 8)}.pdf`);

    // Send PDF
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Generate estimate PDF error:', error);
    res.status(500).json({ error: 'Failed to generate estimate PDF' });
  }
});

// Customer approve estimate endpoint (public, token-based auth)
router.get('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.query;

    if (!token) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invalid Request</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .error { color: #dc2626; }
          </style>
        </head>
        <body>
          <h1 class="error">Invalid Request</h1>
          <p>This link is missing required authentication. Please use the link from your email.</p>
        </body>
        </html>
      `);
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Expired Link</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .error { color: #dc2626; }
          </style>
        </head>
        <body>
          <h1 class="error">Link Expired</h1>
          <p>This approval link has expired. Please contact Matson Brothers Painting for a new estimate.</p>
          <p><a href="mailto:conner@matsonbrotherspainting.com">conner@matsonbrotherspainting.com</a></p>
        </body>
        </html>
      `);
    }

    // Validate token type and action
    if (decoded.type !== 'estimate_action' || decoded.action !== 'approve') {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invalid Link</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .error { color: #dc2626; }
          </style>
        </head>
        <body>
          <h1 class="error">Invalid Link</h1>
          <p>This link is not valid for approving estimates.</p>
        </body>
        </html>
      `);
    }

    // Get current estimate using the full UUID from URL
    const estimateResult = await query(
      `SELECT * FROM estimates WHERE id = $1`,
      [id]
    );

    if (estimateResult.rows.length === 0) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Estimate Not Found</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .error { color: #dc2626; }
          </style>
        </head>
        <body>
          <h1 class="error">Estimate Not Found</h1>
          <p>We couldn't find this estimate. Please contact us for assistance.</p>
          <p><a href="mailto:conner@matsonbrotherspainting.com">conner@matsonbrotherspainting.com</a></p>
        </body>
        </html>
      `);
    }

    const estimate = estimateResult.rows[0];

    // Check if already approved or declined
    if (estimate.status === 'accepted') {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Already Approved</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .success { color: #16a34a; }
          </style>
        </head>
        <body>
          <h1 class="success">✓ Already Approved</h1>
          <p>This estimate has already been approved. We'll be in touch soon!</p>
          <p>Thank you for choosing Matson Brothers Painting!</p>
        </body>
        </html>
      `);
    }

    if (estimate.status === 'rejected') {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Previously Declined</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .info { color: #0284c7; }
          </style>
        </head>
        <body>
          <h1 class="info">Estimate Status</h1>
          <p>This estimate was previously declined. If you'd like to proceed, please contact us.</p>
          <p><a href="mailto:conner@matsonbrotherspainting.com">conner@matsonbrotherspainting.com</a></p>
        </body>
        </html>
      `);
    }

    // Update estimate status to accepted
    await query(
      `UPDATE estimates SET status = 'accepted', updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    // Return success page
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Estimate Approved!</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            text-align: center;
            background: #f9fafb;
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .success { color: #16a34a; font-size: 48px; margin: 0; }
          h1 { color: #1f365c; margin: 20px 0; }
          p { color: #334357; line-height: 1.6; }
          .highlight { background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .contact-info {
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .contact-item {
            margin: 10px 0;
            font-size: 16px;
          }
          .contact-name {
            font-weight: bold;
            color: #1f365c;
          }
          .contact-phone {
            color: #334357;
            text-decoration: none;
          }
          .contact-phone:hover {
            color: #1f365c;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success">✓</div>
          <h1>Estimate Approved!</h1>
          <p>Thank you for approving your estimate with Matson Brothers Painting.</p>
          <div class="highlight">
            <p><strong>What's Next?</strong></p>
            <p>We'll be in touch shortly to schedule your project and answer any questions you may have.</p>
          </div>
          <p style="margin-top: 30px;">If you have any immediate questions, feel free to contact us:</p>
          <div class="contact-info">
            <div class="contact-item">
              <span class="contact-name">Shawn:</span>
              <a href="tel:+18166064797" class="contact-phone">(816) 606-4797</a>
            </div>
            <div class="contact-item">
              <span class="contact-name">Conner:</span>
              <a href="tel:+18164429156" class="contact-phone">(816) 442-9156</a>
            </div>
            <div class="contact-item" style="margin-top: 15px;">
              <a href="mailto:conner@matsonbrotherspainting.com" style="color: #1f365c; font-weight: bold;">conner@matsonbrotherspainting.com</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Approve estimate error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
          .error { color: #dc2626; }
        </style>
      </head>
      <body>
        <h1 class="error">Something Went Wrong</h1>
        <p>We encountered an error processing your request. Please contact us directly.</p>
        <p><a href="mailto:conner@matsonbrotherspainting.com">conner@matsonbrotherspainting.com</a></p>
      </body>
      </html>
    `);
  }
});

// Customer decline estimate endpoint (public, token-based auth)
router.get('/:id/decline', async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.query;

    if (!token) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invalid Request</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .error { color: #dc2626; }
          </style>
        </head>
        <body>
          <h1 class="error">Invalid Request</h1>
          <p>This link is missing required authentication. Please use the link from your email.</p>
        </body>
        </html>
      `);
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Expired Link</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .error { color: #dc2626; }
          </style>
        </head>
        <body>
          <h1 class="error">Link Expired</h1>
          <p>This link has expired. Please contact Matson Brothers Painting if you'd like to discuss this estimate.</p>
          <p><a href="mailto:conner@matsonbrotherspainting.com">conner@matsonbrotherspainting.com</a></p>
        </body>
        </html>
      `);
    }

    // Validate token type and action
    if (decoded.type !== 'estimate_action' || decoded.action !== 'decline') {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invalid Link</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .error { color: #dc2626; }
          </style>
        </head>
        <body>
          <h1 class="error">Invalid Link</h1>
          <p>This link is not valid for declining estimates.</p>
        </body>
        </html>
      `);
    }

    // Get current estimate using the full UUID from URL
    const estimateResult = await query(
      `SELECT * FROM estimates WHERE id = $1`,
      [id]
    );

    if (estimateResult.rows.length === 0) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Estimate Not Found</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .error { color: #dc2626; }
          </style>
        </head>
        <body>
          <h1 class="error">Estimate Not Found</h1>
          <p>We couldn't find this estimate. Please contact us for assistance.</p>
          <p><a href="mailto:conner@matsonbrotherspainting.com">conner@matsonbrotherspainting.com</a></p>
        </body>
        </html>
      `);
    }

    const estimate = estimateResult.rows[0];

    // Check if already declined
    if (estimate.status === 'rejected') {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Already Declined</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
          </style>
        </head>
        <body>
          <h1>Already Declined</h1>
          <p>This estimate has already been declined.</p>
          <p>If you'd like to discuss alternatives, please contact us.</p>
          <p><a href="mailto:conner@matsonbrotherspainting.com">conner@matsonbrotherspainting.com</a></p>
        </body>
        </html>
      `);
    }

    // Update estimate status to rejected
    await query(
      `UPDATE estimates SET status = 'rejected', updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    // Return confirmation page
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Estimate Declined</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            text-align: center;
            background: #f9fafb;
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          h1 { color: #1f365c; margin: 20px 0; }
          p { color: #334357; line-height: 1.6; }
          .highlight { background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Estimate Declined</h1>
          <p>We've received your response and updated the estimate status.</p>
          <div class="highlight">
            <p><strong>We'd Love to Hear Your Feedback</strong></p>
            <p>If you'd like to discuss alternatives or have any questions about the estimate, we're here to help.</p>
          </div>
          <p>Feel free to reach out anytime:</p>
          <p><a href="mailto:conner@matsonbrotherspainting.com" style="color: #1f365c; font-weight: bold;">conner@matsonbrotherspainting.com</a></p>
          <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">Thank you for considering Matson Brothers Painting!</p>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Decline estimate error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
          .error { color: #dc2626; }
        </style>
      </head>
      <body>
        <h1 class="error">Something Went Wrong</h1>
        <p>We encountered an error processing your request. Please contact us directly.</p>
        <p><a href="mailto:conner@matsonbrotherspainting.com">conner@matsonbrotherspainting.com</a></p>
      </body>
      </html>
    `);
  }
});

// ==========================================
// AUTHENTICATED ROUTES
// Apply authenticateToken middleware to all routes defined AFTER this line
// ==========================================
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT e.*, c.name as customer_name, c.email as customer_email
       FROM estimates e
       LEFT JOIN customers c ON e.customer_id = c.id
       ORDER BY e.created_at DESC`
    );
    const estimates = toGidFormatArray(result.rows, 'Estimate', {
      customer_id: 'Customer'
    });
    res.json({ estimates });
  } catch (error) {
    console.error('Get estimates error:', error);
    res.status(500).json({ error: 'Failed to fetch estimates' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const hexPrefix = extractUuidForQuery(id);
    const result = await query(
      `SELECT e.*, c.name as customer_name, c.email as customer_email,
              c.phone as customer_phone, c.address as customer_address
       FROM estimates e
       LEFT JOIN customers c ON e.customer_id = c.id
       WHERE REPLACE(e.id::text, '-', '') LIKE $1`,
      [`${hexPrefix}%`]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Estimate not found' });
    }

    const estimate = toGidFormat(result.rows[0], 'Estimate', {
      customer_id: 'Customer'
    });
    res.json({ estimate });
  } catch (error) {
    console.error('Get estimate error:', error);
    res.status(500).json({ error: 'Failed to fetch estimate' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { customer_id, title, description, line_items, subtotal, tax, total, notes } = req.body;

    if (!customer_id || !title || !total) {
      return res.status(400).json({ error: 'Customer, title, and total are required' });
    }

    // Convert customer GID to UUID for database insert
    const customerHexPrefix = extractUuidForQuery(customer_id);
    const customerResult = await query(
      `SELECT id FROM customers WHERE REPLACE(id::text, '-', '') LIKE $1`,
      [`${customerHexPrefix}%`]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customerUuid = customerResult.rows[0].id;

    const result = await query(
      `INSERT INTO estimates (customer_id, title, description, line_items, subtotal, tax, total, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft')
       RETURNING *`,
      [customerUuid, title, description, JSON.stringify(line_items || []), subtotal, tax, total, notes]
    );

    const estimate = toGidFormat(result.rows[0], 'Estimate', {
      customer_id: 'Customer'
    });
    res.status(201).json({ estimate });
  } catch (error) {
    console.error('Create estimate error:', error);
    res.status(500).json({ error: 'Failed to create estimate' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_id, title, description, line_items, subtotal, tax, total, notes, status } = req.body;

    const hexPrefix = extractUuidForQuery(id);

    // Convert customer GID to UUID if provided
    let customerUuid = customer_id;
    if (customer_id) {
      const customerHexPrefix = extractUuidForQuery(customer_id);
      const customerResult = await query(
        `SELECT id FROM customers WHERE REPLACE(id::text, '-', '') LIKE $1`,
        [`${customerHexPrefix}%`]
      );

      if (customerResult.rows.length === 0) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      customerUuid = customerResult.rows[0].id;
    }

    const result = await query(
      `UPDATE estimates
       SET customer_id = $1, title = $2, description = $3, line_items = $4,
           subtotal = $5, tax = $6, total = $7, notes = $8, status = $9, updated_at = NOW()
       WHERE REPLACE(id::text, '-', '') LIKE $10
       RETURNING *`,
      [customerUuid, title, description, JSON.stringify(line_items || []), subtotal, tax, total, notes, status, `${hexPrefix}%`]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Estimate not found' });
    }

    const estimate = toGidFormat(result.rows[0], 'Estimate', {
      customer_id: 'Customer'
    });
    res.json({ estimate });
  } catch (error) {
    console.error('Update estimate error:', error);
    res.status(500).json({ error: 'Failed to update estimate' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const hexPrefix = extractUuidForQuery(id);
    const result = await query(
      `DELETE FROM estimates WHERE REPLACE(id::text, '-', '') LIKE $1 RETURNING id`,
      [`${hexPrefix}%`]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Estimate not found' });
    }

    res.json({ message: 'Estimate deleted successfully' });
  } catch (error) {
    console.error('Delete estimate error:', error);
    res.status(500).json({ error: 'Failed to delete estimate' });
  }
});


export default router;
