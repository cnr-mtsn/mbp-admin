import express from 'express';
import { query } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { toGidFormat, extractUuidForQuery, toGidFormatArray } from '../utils/resolverHelpers.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT i.*, c.name as customer_name, c.email as customer_email,
              j.title as job_title
       FROM invoices i
       LEFT JOIN customers c ON i.customer_id = c.id
       LEFT JOIN jobs j ON i.job_id = j.id
       ORDER BY i.created_at DESC`
    );
    const invoices = toGidFormatArray(result.rows, 'Invoice', {
      customer_id: 'Customer',
      job_id: 'Job',
      estimate_id: 'Estimate'
    });
    res.json({ invoices });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const hexPrefix = extractUuidForQuery(id);
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

    const invoice = toGidFormat(result.rows[0], 'Invoice', {
      customer_id: 'Customer',
      job_id: 'Job',
      estimate_id: 'Estimate'
    });
    res.json({ invoice });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { customer_id, job_id, estimate_id, title, description, line_items, subtotal, tax, total, payment_stage, percentage, due_date, notes, status } = req.body;

    if (!customer_id || !title || !total) {
      return res.status(400).json({ error: 'Customer, title, and total are required' });
    }

    // Convert customer GID to UUID
    const customerHexPrefix = extractUuidForQuery(customer_id);
    const customerResult = await query(
      `SELECT id FROM customers WHERE REPLACE(id::text, '-', '') LIKE $1`,
      [`${customerHexPrefix}%`]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customerUuid = customerResult.rows[0].id;

    // Convert job GID to UUID if provided
    let jobUuid = null;
    if (job_id) {
      const jobHexPrefix = extractUuidForQuery(job_id);
      const jobResult = await query(
        `SELECT id FROM jobs WHERE REPLACE(id::text, '-', '') LIKE $1`,
        [`${jobHexPrefix}%`]
      );

      if (jobResult.rows.length === 0) {
        return res.status(404).json({ error: 'Job not found' });
      }

      jobUuid = jobResult.rows[0].id;
    }

    // Convert estimate GID to UUID if provided
    let estimateUuid = null;
    if (estimate_id) {
      const estimateHexPrefix = extractUuidForQuery(estimate_id);
      const estimateResult = await query(
        `SELECT id FROM estimates WHERE REPLACE(id::text, '-', '') LIKE $1`,
        [`${estimateHexPrefix}%`]
      );

      if (estimateResult.rows.length === 0) {
        return res.status(404).json({ error: 'Estimate not found' });
      }

      estimateUuid = estimateResult.rows[0].id;
    }

    const result = await query(
      `INSERT INTO invoices (customer_id, job_id, estimate_id, title, description, line_items, subtotal, tax, total, payment_stage, percentage, due_date, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [customerUuid, jobUuid, estimateUuid, title, description, JSON.stringify(line_items || []), subtotal, tax, total, payment_stage, percentage, due_date, notes, status || 'unpaid']
    );

    // Update job total_amount with sum of all invoice totals
    if (jobUuid) {
      await query(
        `UPDATE jobs
         SET total_amount = (
           SELECT COALESCE(SUM(total), 0)
           FROM invoices
           WHERE job_id = $1
         ),
         updated_at = NOW()
         WHERE id = $1`,
        [jobUuid]
      );
    }

    const invoice = toGidFormat(result.rows[0], 'Invoice', {
      customer_id: 'Customer',
      job_id: 'Job',
      estimate_id: 'Estimate'
    });
    res.status(201).json({ invoice });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_id, job_id, estimate_id, title, description, line_items, subtotal, tax, total, payment_stage, percentage, due_date, notes, status, paid_date, payment_method } = req.body;

    const hexPrefix = extractUuidForQuery(id);

    // Get existing invoice to track job_id changes
    const existingInvoiceResult = await query(
      `SELECT * FROM invoices WHERE REPLACE(id::text, '-', '') LIKE $1`,
      [`${hexPrefix}%`]
    );

    if (existingInvoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const existingInvoice = existingInvoiceResult.rows[0];

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

    // Convert job GID to UUID if provided
    let jobUuid = job_id;
    if (job_id) {
      const jobHexPrefix = extractUuidForQuery(job_id);
      const jobResult = await query(
        `SELECT id FROM jobs WHERE REPLACE(id::text, '-', '') LIKE $1`,
        [`${jobHexPrefix}%`]
      );

      if (jobResult.rows.length === 0) {
        return res.status(404).json({ error: 'Job not found' });
      }

      jobUuid = jobResult.rows[0].id;
    }

    // Convert estimate GID to UUID if provided
    let estimateUuid = estimate_id;
    if (estimate_id) {
      const estimateHexPrefix = extractUuidForQuery(estimate_id);
      const estimateResult = await query(
        `SELECT id FROM estimates WHERE REPLACE(id::text, '-', '') LIKE $1`,
        [`${estimateHexPrefix}%`]
      );

      if (estimateResult.rows.length === 0) {
        return res.status(404).json({ error: 'Estimate not found' });
      }

      estimateUuid = estimateResult.rows[0].id;
    }

    const result = await query(
      `UPDATE invoices
       SET customer_id = $1, job_id = $2, estimate_id = $3, title = $4, description = $5,
           line_items = $6, subtotal = $7, tax = $8, total = $9, payment_stage = $10,
           percentage = $11, due_date = $12, notes = $13, status = $14, paid_date = $15,
           payment_method = $16, updated_at = NOW()
       WHERE REPLACE(id::text, '-', '') LIKE $17
       RETURNING *`,
      [customerUuid, jobUuid, estimateUuid, title, description, JSON.stringify(line_items || []), subtotal, tax, total, payment_stage, percentage, due_date, notes, status, paid_date, payment_method, `${hexPrefix}%`]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const updatedInvoice = result.rows[0];

    // Update job total_amount if invoice is linked to a job
    if (updatedInvoice.job_id) {
      await query(
        `UPDATE jobs
         SET total_amount = (
           SELECT COALESCE(SUM(total), 0)
           FROM invoices
           WHERE job_id = $1
         ),
         updated_at = NOW()
         WHERE id = $1`,
        [updatedInvoice.job_id]
      );

      // Check if all invoices for the job are paid
      const jobInvoicesResult = await query(
        `SELECT COUNT(*) as total_invoices,
                COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_invoices
         FROM invoices
         WHERE job_id = $1`,
        [updatedInvoice.job_id]
      );

      const { total_invoices, paid_invoices } = jobInvoicesResult.rows[0];

      // If all invoices are paid, update the job status to 'paid'
      if (parseInt(total_invoices) > 0 && parseInt(total_invoices) === parseInt(paid_invoices)) {
        await query(
          `UPDATE jobs
           SET status = 'paid', updated_at = NOW()
           WHERE id = $1 AND status != 'paid'`,
          [updatedInvoice.job_id]
        );
      }
    }

    // If the job_id changed from the original, also update the old job's total
    if (existingInvoice.job_id && existingInvoice.job_id !== updatedInvoice.job_id) {
      await query(
        `UPDATE jobs
         SET total_amount = (
           SELECT COALESCE(SUM(total), 0)
           FROM invoices
           WHERE job_id = $1
         ),
         updated_at = NOW()
         WHERE id = $1`,
        [existingInvoice.job_id]
      );
    }

    const invoice = toGidFormat(updatedInvoice, 'Invoice', {
      customer_id: 'Customer',
      job_id: 'Job',
      estimate_id: 'Estimate'
    });
    res.json({ invoice });
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const hexPrefix = extractUuidForQuery(id);

    // First get the invoice to know which job to update
    const invoiceResult = await query(
      `SELECT * FROM invoices WHERE REPLACE(id::text, '-', '') LIKE $1`,
      [`${hexPrefix}%`]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const deletedInvoice = invoiceResult.rows[0];

    // Delete the invoice
    const result = await query(
      `DELETE FROM invoices WHERE REPLACE(id::text, '-', '') LIKE $1 RETURNING id`,
      [`${hexPrefix}%`]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Update job total_amount if invoice was linked to a job
    if (deletedInvoice.job_id) {
      await query(
        `UPDATE jobs
         SET total_amount = (
           SELECT COALESCE(SUM(total), 0)
           FROM invoices
           WHERE job_id = $1
         ),
         updated_at = NOW()
         WHERE id = $1`,
        [deletedInvoice.job_id]
      );
    }

    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
});

router.post('/:id/send', async (req, res) => {
  try {
    const { id } = req.params;
    const hexPrefix = extractUuidForQuery(id);

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

    if (!invoice.customer_email) {
      return res.status(400).json({ error: 'Customer email not found' });
    }

    // Dynamic import to load the email service
    const { sendInvoiceEmail } = await import('../services/emailService.js');

    // Send the invoice email with PDF
    await sendInvoiceEmail(invoice);

    res.json({ message: 'Invoice sent successfully' });
  } catch (error) {
    console.error('Send invoice error:', error);
    res.status(500).json({ error: error.message || 'Failed to send invoice' });
  }
});

export default router;
