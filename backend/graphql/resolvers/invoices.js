import { query } from '../../config/database.js';
import { toGidFormat, toGidFormatArray } from '../../utils/resolverHelpers.js';
import { extractUuid } from '../../utils/gid.js';

const requireAuth = (user) => {
  if (!user) {
    throw new Error('Not authenticated');
  }
};

export const invoiceResolvers = {
  Query: {
    invoices: async (_, __, { user }) => {
      requireAuth(user);
      const result = await query(
        'SELECT * FROM invoices ORDER BY created_at DESC'
      );
      return toGidFormatArray(result.rows, 'Invoice', { foreignKeys: ['customer_id', 'job_id', 'estimate_id'] }).map(row => ({
        ...row,
        line_items: typeof row.line_items === 'string' ? JSON.parse(row.line_items) : row.line_items
      }));
    },

    invoice: async (_, { id }, { user }) => {
      requireAuth(user);
      const hexPrefix = extractUuid(id);
      const result = await query(
        `SELECT * FROM invoices WHERE REPLACE(id::text, '-', '') LIKE $1`,
        [`${hexPrefix}%`]
      );

      if (result.rows.length === 0) {
        throw new Error('Invoice not found');
      }

      const invoice = toGidFormat(result.rows[0], 'Invoice', { foreignKeys: ['customer_id', 'job_id', 'estimate_id'] });
      return {
        ...invoice,
        line_items: typeof invoice.line_items === 'string' ? JSON.parse(invoice.line_items) : invoice.line_items
      };
    },

    unlinkedInvoices: async (_, __, { user }) => {
      requireAuth(user);
      const result = await query(
        'SELECT * FROM invoices WHERE job_id IS NULL ORDER BY created_at DESC'
      );
      return toGidFormatArray(result.rows, 'Invoice', { foreignKeys: ['customer_id', 'job_id', 'estimate_id'] }).map(row => ({
        ...row,
        line_items: typeof row.line_items === 'string' ? JSON.parse(row.line_items) : row.line_items
      }));
    },
  },

  Invoice: {
    customer: async (parent) => {
      const hexPrefix = extractUuid(parent.customer_id);
      const result = await query(
        `SELECT * FROM customers WHERE REPLACE(id::text, '-', '') LIKE $1`,
        [`${hexPrefix}%`]
      );
      return toGidFormat(result.rows[0], 'Customer');
    },

    job: async (parent) => {
      if (!parent.job_id) return null;
      const hexPrefix = extractUuid(parent.job_id);
      const result = await query(
        `SELECT * FROM jobs WHERE REPLACE(id::text, '-', '') LIKE $1`,
        [`${hexPrefix}%`]
      );
      return toGidFormat(result.rows[0], 'Job', { foreignKeys: ['customer_id', 'estimate_id'] });
    },

    estimate: async (parent) => {
      if (!parent.estimate_id) return null;
      const hexPrefix = extractUuid(parent.estimate_id);
      const result = await query(
        `SELECT * FROM estimates WHERE REPLACE(id::text, '-', '') LIKE $1`,
        [`${hexPrefix}%`]
      );
      return toGidFormat(result.rows[0], 'Estimate', { foreignKeys: ['customer_id'] });
    },
  },

  Mutation: {
    createInvoice: async (_, { input }, { user }) => {
      requireAuth(user);
      const {
        customer_id,
        job_id,
        estimate_id,
        title,
        description,
        line_items,
        subtotal,
        tax,
        total,
        payment_stage,
        percentage,
        due_date,
        notes,
        status
      } = input;

      // Get full UUIDs from the database
      const customerHexPrefix = extractUuid(customer_id);
      const customerResult = await query(
        `SELECT id FROM customers WHERE REPLACE(id::text, '-', '') LIKE $1`,
        [`${customerHexPrefix}%`]
      );

      if (customerResult.rows.length === 0) {
        throw new Error('Customer not found');
      }

      const customerUuid = customerResult.rows[0].id;
      let jobUuid = null;
      let estimateUuid = null;

      if (job_id) {
        const jobHexPrefix = extractUuid(job_id);
        const jobResult = await query(
          `SELECT id FROM jobs WHERE REPLACE(id::text, '-', '') LIKE $1`,
          [`${jobHexPrefix}%`]
        );

        if (jobResult.rows.length === 0) {
          throw new Error('Job not found');
        }

        jobUuid = jobResult.rows[0].id;
      }

      if (estimate_id) {
        const estimateHexPrefix = extractUuid(estimate_id);
        const estimateResult = await query(
          `SELECT id FROM estimates WHERE REPLACE(id::text, '-', '') LIKE $1`,
          [`${estimateHexPrefix}%`]
        );

        if (estimateResult.rows.length === 0) {
          throw new Error('Estimate not found');
        }

        estimateUuid = estimateResult.rows[0].id;
      }

      // Get next invoice number
      const lastInvoiceResult = await query(
        `SELECT invoice_number FROM invoices
         WHERE invoice_number ~ '^[0-9]+$'
         ORDER BY CAST(invoice_number AS INTEGER) DESC
         LIMIT 1`
      );
      let nextInvoiceNumber = 1;
      if (lastInvoiceResult.rows.length > 0 && lastInvoiceResult.rows[0].invoice_number) {
        nextInvoiceNumber = parseInt(lastInvoiceResult.rows[0].invoice_number) + 1;
      }

      const result = await query(
        `INSERT INTO invoices (customer_id, job_id, estimate_id, invoice_number, title, description, line_items, subtotal, tax, total, payment_stage, percentage, due_date, notes, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING *`,
        [customerUuid, jobUuid, estimateUuid, nextInvoiceNumber.toString(), title, description, JSON.stringify(line_items || []), subtotal, tax, total, payment_stage, percentage, due_date, notes, status || 'unpaid']
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

      const invoice = toGidFormat(result.rows[0], 'Invoice', { foreignKeys: ['customer_id', 'job_id', 'estimate_id'] });
      return {
        ...invoice,
        line_items: typeof invoice.line_items === 'string' ? JSON.parse(invoice.line_items) : invoice.line_items
      };
    },

    updateInvoice: async (_, { id, input }, { user }) => {
      requireAuth(user);
      const hexPrefix = extractUuid(id);

      // First, get the existing invoice
      const existingResult = await query(
        `SELECT * FROM invoices WHERE REPLACE(id::text, '-', '') LIKE $1`,
        [`${hexPrefix}%`]
      );

      if (existingResult.rows.length === 0) {
        throw new Error('Invoice not found');
      }

      const existingInvoice = existingResult.rows[0];

      // Merge input with existing data
      const {
        customer_id = existingInvoice.customer_id,
        job_id = existingInvoice.job_id,
        estimate_id = existingInvoice.estimate_id,
        title = existingInvoice.title,
        description = existingInvoice.description,
        line_items = existingInvoice.line_items,
        subtotal = existingInvoice.subtotal,
        tax = existingInvoice.tax,
        total = existingInvoice.total,
        payment_stage = existingInvoice.payment_stage,
        percentage = existingInvoice.percentage,
        due_date = existingInvoice.due_date,
        paid_date = existingInvoice.paid_date,
        payment_method = existingInvoice.payment_method,
        notes = existingInvoice.notes,
        status = existingInvoice.status
      } = { ...existingInvoice, ...input };

      const result = await query(
        `UPDATE invoices
         SET customer_id = $1, job_id = $2, estimate_id = $3, title = $4, description = $5,
             line_items = $6, subtotal = $7, tax = $8, total = $9, payment_stage = $10,
             percentage = $11, due_date = $12, paid_date = $13, payment_method = $14,
             notes = $15, status = $16, updated_at = NOW()
         WHERE REPLACE(id::text, '-', '') LIKE $17
         RETURNING *`,
        [customer_id, job_id, estimate_id, title, description, typeof line_items === 'string' ? line_items : JSON.stringify(line_items || []), subtotal, tax, total, payment_stage, percentage, due_date, paid_date, payment_method, notes, status, `${hexPrefix}%`]
      );

      if (result.rows.length === 0) {
        throw new Error('Invoice not found');
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

      const invoice = toGidFormat(updatedInvoice, 'Invoice', { foreignKeys: ['customer_id', 'job_id', 'estimate_id'] });
      return {
        ...invoice,
        line_items: typeof invoice.line_items === 'string' ? JSON.parse(invoice.line_items) : invoice.line_items
      };
    },

    deleteInvoice: async (_, { id }, { user }) => {
      requireAuth(user);
      const hexPrefix = extractUuid(id);

      // First get the invoice to know which job to update
      const invoiceResult = await query(
        `SELECT * FROM invoices WHERE REPLACE(id::text, '-', '') LIKE $1`,
        [`${hexPrefix}%`]
      );

      if (invoiceResult.rows.length === 0) {
        throw new Error('Invoice not found');
      }

      const deletedInvoice = invoiceResult.rows[0];

      // Delete the invoice
      const result = await query(
        `DELETE FROM invoices WHERE REPLACE(id::text, '-', '') LIKE $1 RETURNING id`,
        [`${hexPrefix}%`]
      );

      if (result.rows.length === 0) {
        throw new Error('Invoice not found');
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

      return true;
    },

    sendInvoice: async (_, { id }, { user }) => {
      requireAuth(user);
      const hexPrefix = extractUuid(id);

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
        throw new Error('Invoice not found');
      }

      const invoice = result.rows[0];

      if (!invoice.customer_email) {
        throw new Error('Customer email not found');
      }

      // Dynamic import to load the email service
      const { sendInvoiceEmail } = await import('../../services/emailService.js');

      // Send the invoice email with PDF
      await sendInvoiceEmail(invoice);

      return true;
    },
  },
};
