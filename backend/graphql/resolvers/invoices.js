import { query } from '../../config/database.js';
import { toGidFormat, toGidFormatArray } from '../../utils/resolverHelpers.js';
import { extractUuid } from '../../utils/gid.js';
import { fetchPaymentsWithInvoices } from './payments.js';
import { cachedResolver, invalidateCache, generateListTags } from '../../utils/cachedResolver.js';

const requireAuth = (user) => {
  if (!user) {
    throw new Error('Not authenticated');
  }
};

export const invoiceResolvers = {
  Query: {
    previewInvoiceEmail: async (_, { id }, { user }) => {
      requireAuth(user);
      const hexPrefix = extractUuid(id);
      const result = await query(
        `SELECT i.*, c.name as customer_name, c.company_name as company_name,c.email as customer_email,
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

      console.log('[previewInvoiceEmail] Invoice due_date from DB:', invoice.due_date);

      // Dynamic import to get email preview function
      const { getInvoiceEmailPreview } = await import('../../services/emailService.js');

      // Get email preview data
      return getInvoiceEmailPreview(invoice);
    },

    invoices: cachedResolver(
      async (_, { first, offset }, { user }) => {
        requireAuth(user);

        let limitOffsetClause = '';
        const queryParams = [];
        let paramCount = 0;

        if (first) {
          paramCount++;
          limitOffsetClause += `LIMIT $${paramCount}`;
          queryParams.push(first);
        }
        if (offset) {
          paramCount++;
          limitOffsetClause += ` OFFSET $${paramCount}`;
          queryParams.push(offset);
        }

        const result = await query(
          `SELECT * FROM invoices ORDER BY created_at DESC ${limitOffsetClause}`,
          queryParams
        );
        return toGidFormatArray(result.rows, 'Invoice', { foreignKeys: ['customer_id', 'job_id', 'estimate_id'] }).map(row => ({
          ...row,
          line_items: typeof row.line_items === 'string' ? JSON.parse(row.line_items) : row.line_items
        }));
      },
      {
        operationName: 'invoices',
        getTags: (args, result) => generateListTags('invoice', {}, result),
        ttl: 300000, // 5 minutes
      }
    ),

    invoice: cachedResolver(
      async (_, { id }, { user }) => {
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
      {
        operationName: 'invoice',
        getTags: (args, result) => [
          `invoice:${result.id}`,
          ...(result.job_id ? [`invoice:job:${result.job_id}`] : []),
        ],
        ttl: 300000, // 5 minutes
      }
    ),

    unlinkedInvoices: cachedResolver(
      async (_, __, { user }) => {
        requireAuth(user);
        const result = await query(
          'SELECT * FROM invoices WHERE job_id IS NULL ORDER BY created_at DESC'
        );
        return toGidFormatArray(result.rows, 'Invoice', { foreignKeys: ['customer_id', 'job_id', 'estimate_id'] }).map(row => ({
          ...row,
          line_items: typeof row.line_items === 'string' ? JSON.parse(row.line_items) : row.line_items
        }));
      },
      {
        operationName: 'unlinkedInvoices',
        getTags: (args, result) => ['invoice:unlinked', ...result.map(inv => `invoice:${inv.id}`)],
        ttl: 300000, // 5 minutes
      }
    ),

    searchInvoices: cachedResolver(
      async (_, { invoiceNumber, email, name }) => {
        // Validate only one search field
        const fieldsProvided = [invoiceNumber, email, name].filter(Boolean).length;
        if (fieldsProvided === 0) {
          throw new Error('Please provide at least one search criteria');
        }
        if (fieldsProvided > 1) {
          throw new Error('Please search by only ONE field');
        }

        let queryText, queryParams;

        if (invoiceNumber) {
          queryText = `
            SELECT i.*, c.name as customer_name, c.company_name as company_name, c.email as customer_email
            FROM invoices i
            LEFT JOIN customers c ON i.customer_id = c.id
            WHERE i.invoice_number = $1
            ORDER BY i.created_at DESC
          `;
          queryParams = [invoiceNumber];
        } else if (email) {
          queryText = `
            SELECT i.*, c.name as customer_name, c.company_name as company_name, c.email as customer_email
            FROM invoices i
            LEFT JOIN customers c ON i.customer_id = c.id
            WHERE LOWER(c.email) = LOWER($1)
            ORDER BY i.created_at DESC
          `;
          queryParams = [email];
        } else if (name) {
          queryText = `
            SELECT i.*, c.name as customer_name, c.company_name as company_name, c.email as customer_email
            FROM invoices i
            LEFT JOIN customers c ON i.customer_id = c.id
            WHERE LOWER(c.name) LIKE LOWER($1)
            ORDER BY i.created_at DESC
          `;
          queryParams = [`%${name}%`];
        }

        const result = await query(queryText, queryParams);

        return toGidFormatArray(result.rows, 'Invoice', {
          foreignKeys: ['customer_id', 'job_id', 'estimate_id']
        }).map(row => ({
          ...row,
          line_items: typeof row.line_items === 'string' ? JSON.parse(row.line_items) : row.line_items,
          customer_name: row.customer_name,
          company_name: row.company_name,
          customer_email: row.customer_email,
        }));
      },
      {
        operationName: 'searchInvoices',
        getTags: (args, result) => [
          'invoice:all',
          ...result.map(inv => `invoice:${inv.id}`)
        ],
        ttl: 60000, // 1 minute
      }
    ),
  },

  Invoice: {
    customer: cachedResolver(
      async (parent) => {
        const hexPrefix = extractUuid(parent.customer_id);
        const result = await query(
          `SELECT * FROM customers WHERE REPLACE(id::text, '-', '') LIKE $1`,
          [`${hexPrefix}%`]
        );
        return toGidFormat(result.rows[0], 'Customer');
      },
      {
        operationName: 'Invoice.customer',
        getKey: (parent) => ({ customer_id: parent.customer_id }),
        getTags: (args, result) => [`customer:${result.id}`],
        ttl: 600000, // 10 minutes
      }
    ),

    job: cachedResolver(
      async (parent) => {
        if (!parent.job_id) return null;
        const hexPrefix = extractUuid(parent.job_id);
        const result = await query(
          `SELECT j.*,
                  (SELECT COUNT(*) FROM invoices WHERE job_id = j.id) as invoice_count,
                  (SELECT COUNT(*) FROM invoices WHERE job_id = j.id AND status = 'paid') as paid_count,
                  (SELECT SUM(total) FROM invoices WHERE job_id = j.id AND status = 'paid') as amount_paid
           FROM jobs j
           WHERE REPLACE(j.id::text, '-', '') LIKE $1`,
          [`${hexPrefix}%`]
        );
        return toGidFormat(result.rows[0], 'Job', { foreignKeys: ['customer_id', 'estimate_id'] });
      },
      {
        operationName: 'Invoice.job',
        getKey: (parent) => ({ job_id: parent.job_id }),
        getTags: (args, result) => result ? [`job:${result.id}`] : [],
        ttl: 300000, // 5 minutes
      }
    ),

    estimate: cachedResolver(
      async (parent) => {
        if (!parent.estimate_id) return null;
        const hexPrefix = extractUuid(parent.estimate_id);
        const result = await query(
          `SELECT * FROM estimates WHERE REPLACE(id::text, '-', '') LIKE $1`,
          [`${hexPrefix}%`]
        );
        return toGidFormat(result.rows[0], 'Estimate', { foreignKeys: ['customer_id'] });
      },
      {
        operationName: 'Invoice.estimate',
        getKey: (parent) => ({ estimate_id: parent.estimate_id }),
        getTags: (args, result) => result ? [`estimate:${result.id}`] : [],
        ttl: 300000, // 5 minutes
      }
    ),

    payments: cachedResolver(
      async (parent) => {
        return fetchPaymentsWithInvoices({ invoiceId: parent.id });
      },
      {
        operationName: 'Invoice.payments',
        getKey: (parent) => ({ invoice_id: parent.id }),
        getTags: (args, result) => result.map(payment => `payment:${payment.id}`),
        ttl: 300000, // 5 minutes
      }
    ),
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

      // Invalidate cache after creating invoice
      invalidateCache([
        'invoice:all',
        'invoice:unlinked',
        ...(jobUuid ? [
          `invoice:job:${jobUuid}`,
          `job:${jobUuid}`,
          'job:all',
        ] : []),
        'dashboard:analytics',
      ]);

      return {
        ...invoice,
        line_items: typeof invoice.line_items === 'string' ? JSON.parse(invoice.line_items) : invoice.line_items
      };
    },

    updateInvoice: async (_, { id, input }, { user, req }) => {
      // Allow webhook calls with valid API key
      const apiKey = req?.headers?.['x-api-key'];
      const validWebhookKey = apiKey && apiKey === process.env.WEBHOOK_API_KEY;

      if (!validWebhookKey) {
        requireAuth(user);
      }
      const hexPrefix = extractUuid(id);

      console.log('[updateInvoice] Received input:', JSON.stringify(input, null, 2));

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

      console.log('[updateInvoice] Merged due_date value:', due_date);

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

      // Invalidate cache after updating invoice
      const hexId = extractUuid(id);
      invalidateCache([
        'invoice:all',
        'invoice:unlinked',
        `invoice:${hexId}`,
        ...(updatedInvoice.job_id ? [
          `invoice:job:${updatedInvoice.job_id}`,
          `job:${updatedInvoice.job_id}`,
          'job:all',
        ] : []),
        // If job changed, also invalidate old job
        ...(existingInvoice.job_id && existingInvoice.job_id !== updatedInvoice.job_id ? [
          `invoice:job:${existingInvoice.job_id}`,
          `job:${existingInvoice.job_id}`,
        ] : []),
        'dashboard:analytics',
      ]);

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

      // Invalidate cache after deleting invoice
      invalidateCache([
        'invoice:all',
        'invoice:unlinked',
        `invoice:${hexPrefix}`,
        ...(deletedInvoice.job_id ? [
          `invoice:job:${deletedInvoice.job_id}`,
          `job:${deletedInvoice.job_id}`,
          'job:all',
        ] : []),
        'dashboard:analytics',
      ]);

      return true;
    },

    sendInvoice: async (_, { id, recipientEmail, ccEmails, subject, body }, { user }) => {
      requireAuth(user);
      const hexPrefix = extractUuid(id);

      // Fetch invoice with customer information
      const result = await query(
        `SELECT i.*, c.name as customer_name, c.email as customer_email,
                c.phone as customer_phone, c.company_name as company_name, c.address as customer_address,
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

      if (!invoice.customer_email && !recipientEmail) {
        throw new Error('Customer email not found');
      }

      // Dynamic import to load the email service
      const { sendInvoiceEmail } = await import('../../services/emailService.js');

      // Send the invoice email with PDF, with optional custom parameters
      await sendInvoiceEmail(invoice, {
        recipientEmail,
        ccEmails,
        subject,
        body
      });

      return true;
    },
  },
};
