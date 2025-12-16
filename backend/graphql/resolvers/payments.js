import { query } from '../../config/database.js';
import { toGidFormat } from '../../utils/resolverHelpers.js';
import { toGid, extractUuid } from '../../utils/gid.js';

const requireAuth = (user) => {
  if (!user) {
    throw new Error('Not authenticated');
  }
};

const buildPaymentResponses = (rows) => {
  const payments = new Map();

  rows.forEach(row => {
    const paymentId = row.payment_invoice_payment_id || row.id;

    if (!payments.has(paymentId)) {
      const payment = toGidFormat(row, 'Payment', { foreignKeys: ['customer_id'] });

      payments.set(paymentId, {
        ...payment,
        total_amount: parseFloat(row.total_amount),
        invoices: [],
      });
    }

    const invoice = {
      id: toGid('Invoice', row.invoice_id),
      invoice_number: row.invoice_number,
      title: row.invoice_title,
      total: parseFloat(row.invoice_total),
      status: row.invoice_status,
      payment_stage: row.payment_stage,
      percentage: row.percentage,
      job_id: row.invoice_job_id ? toGid('Job', row.invoice_job_id) : null,
      customer_id: row.invoice_customer_id ? toGid('Customer', row.invoice_customer_id) : null,
    };

    payments.get(paymentId).invoices.push({
      id: toGid('PaymentInvoice', row.payment_invoice_id),
      payment_id: toGid('Payment', paymentId),
      invoice_id: invoice.id,
      amount_applied: parseFloat(row.amount_applied),
      created_at: row.payment_invoice_created_at,
      invoice,
    });
  });

  return Array.from(payments.values());
};

export const fetchPaymentsWithInvoices = async ({ customerId, jobId, invoiceId }) => {
  const conditions = [];
  const params = [];

  if (customerId) {
    const hexPrefix = extractUuid(customerId);
    conditions.push(`REPLACE(p.customer_id::text, '-', '') LIKE $${params.length + 1}`);
    params.push(`${hexPrefix}%`);
  }

  if (jobId) {
    const hexPrefix = extractUuid(jobId);
    conditions.push(`REPLACE(i.job_id::text, '-', '') LIKE $${params.length + 1}`);
    params.push(`${hexPrefix}%`);
  }

  if (invoiceId) {
    const hexPrefix = extractUuid(invoiceId);
    conditions.push(`REPLACE(pi.invoice_id::text, '-', '') LIKE $${params.length + 1}`);
    params.push(`${hexPrefix}%`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query(
    `SELECT
        p.*,
        pi.id as payment_invoice_id,
        pi.payment_id as payment_invoice_payment_id,
        pi.invoice_id,
        pi.amount_applied,
        pi.created_at as payment_invoice_created_at,
        i.invoice_number,
        i.title as invoice_title,
        i.total as invoice_total,
        i.status as invoice_status,
        i.payment_stage,
        i.percentage,
        i.job_id as invoice_job_id,
        i.customer_id as invoice_customer_id
     FROM payments p
     JOIN payment_invoices pi ON pi.payment_id = p.id
     JOIN invoices i ON i.id = pi.invoice_id
     ${whereClause}
     ORDER BY p.payment_date DESC, p.created_at DESC`,
    params
  );

  return buildPaymentResponses(result.rows);
};

const recalcJobStatus = async (jobId) => {
  const jobStats = await query(
    `SELECT COUNT(*) as total_invoices,
            COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_invoices
     FROM invoices
     WHERE job_id = $1`,
    [jobId]
  );

  const { total_invoices, paid_invoices } = jobStats.rows[0];
  const hasInvoices = parseInt(total_invoices) > 0;
  const allPaid = hasInvoices && parseInt(total_invoices) === parseInt(paid_invoices);

  await query(
    `UPDATE jobs
     SET status = CASE
       WHEN $2 THEN 'paid'
       WHEN status = 'paid' THEN 'in_progress'
       ELSE status
     END,
     updated_at = NOW()
     WHERE id = $1`,
    [jobId, allPaid]
  );
};

const recalcInvoices = async (invoiceIds = []) => {
  for (const invoiceId of invoiceIds) {
    const invoiceResult = await query(
      `SELECT id, total, due_date, payment_method, status, job_id
       FROM invoices
       WHERE id = $1`,
      [invoiceId]
    );

    if (invoiceResult.rows.length === 0) continue;

    const invoice = invoiceResult.rows[0];
    const paymentAgg = await query(
      `SELECT
          COALESCE(SUM(pi.amount_applied), 0) as total_applied,
          MAX(p.payment_date) as last_payment_date,
          (ARRAY_AGG(p.payment_method ORDER BY p.payment_date DESC))[1] as last_payment_method
       FROM payment_invoices pi
       JOIN payments p ON pi.payment_id = p.id
       WHERE pi.invoice_id = $1`,
      [invoiceId]
    );

    const aggregation = paymentAgg.rows[0];
    const totalApplied = parseFloat(aggregation.total_applied) || 0;
    const isPaid = totalApplied >= parseFloat(invoice.total) - 0.01;
    const isOverdue = invoice.due_date && new Date(invoice.due_date) < new Date();

    let status = isPaid ? 'paid' : (isOverdue ? 'overdue' : 'sent');
    let paidDate = isPaid ? aggregation.last_payment_date || invoice.due_date : null;
    let paymentMethod = isPaid ? aggregation.last_payment_method || invoice.payment_method : null;

    await query(
      `UPDATE invoices
       SET status = $1,
           paid_date = $2,
           payment_method = $3,
           updated_at = NOW()
       WHERE id = $4`,
      [status, paidDate, paymentMethod, invoiceId]
    );

    if (invoice.job_id) {
      await recalcJobStatus(invoice.job_id);
    }
  }
};

export const paymentResolvers = {
  Query: {
    payments: async (_, { customer_id, job_id, invoice_id }, { user }) => {
      requireAuth(user);
      return fetchPaymentsWithInvoices({
        customerId: customer_id,
        jobId: job_id,
        invoiceId: invoice_id,
      });
    },

    payment: async (_, { id }, { user }) => {
      requireAuth(user);
      const hexPrefix = extractUuid(id);
      const result = await query(
        `SELECT * FROM payments WHERE REPLACE(id::text, '-', '') LIKE $1`,
        [`${hexPrefix}%`]
      );

      if (result.rows.length === 0) {
        throw new Error('Payment not found');
      }

      const payment = result.rows[0];
      return {
        ...toGidFormat(payment, 'Payment', { foreignKeys: ['customer_id'] }),
        total_amount: parseFloat(payment.total_amount),
      };
    },
  },

  Payment: {
    customer: async (parent) => {
      const hexPrefix = extractUuid(parent.customer_id);
      const result = await query(
        `SELECT * FROM customers WHERE REPLACE(id::text, '-', '') LIKE $1`,
        [`${hexPrefix}%`]
      );
      return toGidFormat(result.rows[0], 'Customer');
    },

    invoices: async (parent) => {
      if (parent.invoices !== undefined) {
        return parent.invoices;
      }

      const hexPrefix = extractUuid(parent.id);
      const result = await query(
        `SELECT pi.*, i.*
         FROM payment_invoices pi
         JOIN invoices i ON pi.invoice_id = i.id
         WHERE REPLACE(pi.payment_id::text, '-', '') LIKE $1`,
        [`${hexPrefix}%`]
      );

      return result.rows.map(row => ({
        id: toGid('PaymentInvoice', row.id),
        payment_id: toGid('Payment', row.payment_id),
        invoice_id: toGid('Invoice', row.invoice_id),
        amount_applied: parseFloat(row.amount_applied),
        created_at: row.created_at,
        invoice: {
          ...row,
          id: toGid('Invoice', row.invoice_id),
          customer_id: toGid('Customer', row.customer_id),
          job_id: row.job_id ? toGid('Job', row.job_id) : null,
          estimate_id: row.estimate_id ? toGid('Estimate', row.estimate_id) : null,
          line_items: typeof row.line_items === 'string' ? JSON.parse(row.line_items) : row.line_items,
        },
      }));
    },
  },

  Mutation: {
    recordPayment: async (_, { input }, { user, req }) => {
      // Allow webhook calls with valid API key
      const apiKey = req?.headers?.['x-api-key'];
      const validWebhookKey = apiKey && apiKey === process.env.WEBHOOK_API_KEY;

      if (!validWebhookKey) {
        requireAuth(user);
      }

      const { customer_id, payment_method, total_amount, payment_date, notes, invoices: invoiceInputs } = input;

      // Get customer UUID
      const customerHexPrefix = extractUuid(customer_id);
      const customerResult = await query(
        `SELECT id FROM customers WHERE REPLACE(id::text, '-', '') LIKE $1`,
        [`${customerHexPrefix}%`]
      );

      if (customerResult.rows.length === 0) {
        throw new Error('Customer not found');
      }

      const customerUuid = customerResult.rows[0].id;

      // Validate that total_amount matches sum of invoice amounts
      const totalApplied = invoiceInputs.reduce((sum, inv) => sum + parseFloat(inv.amount_applied), 0);
      if (Math.abs(totalApplied - parseFloat(total_amount)) > 0.01) {
        throw new Error('Total amount must equal sum of amounts applied to invoices');
      }

      // Create payment record
      const paymentResult = await query(
        `INSERT INTO payments (customer_id, payment_method, total_amount, payment_date, notes)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          customerUuid,
          payment_method,
          total_amount,
          payment_date || new Date().toISOString(),
          notes,
        ]
      );

      const payment = paymentResult.rows[0];
      const affectedInvoices = [];

      // Process each invoice
      for (const invoiceInput of invoiceInputs) {
        const invoiceHexPrefix = extractUuid(invoiceInput.invoice_id);

        // Get invoice UUID and current details
        const invoiceResult = await query(
          `SELECT id, total FROM invoices WHERE REPLACE(id::text, '-', '') LIKE $1`,
          [`${invoiceHexPrefix}%`]
        );

        if (invoiceResult.rows.length === 0) {
          throw new Error(`Invoice with id ${invoiceInput.invoice_id} not found`);
        }

        const invoiceUuid = invoiceResult.rows[0].id;
        const invoiceTotal = parseFloat(invoiceResult.rows[0].total);
        const amountApplied = parseFloat(invoiceInput.amount_applied);

        // Validate amount doesn't exceed invoice total
        if (amountApplied > invoiceTotal + 0.01) {
          throw new Error(`Amount applied ($${amountApplied}) exceeds invoice total ($${invoiceTotal})`);
        }

        affectedInvoices.push(invoiceUuid);

        // Create payment_invoice record
        await query(
          `INSERT INTO payment_invoices (payment_id, invoice_id, amount_applied)
           VALUES ($1, $2, $3)`,
          [payment.id, invoiceUuid, amountApplied]
        );
      }

      await recalcInvoices(affectedInvoices);

      return {
        ...toGidFormat(payment, 'Payment', { foreignKeys: ['customer_id'] }),
        total_amount: parseFloat(payment.total_amount),
      };
    },

    updatePayment: async (_, { id, input }, { user }) => {
      requireAuth(user);
      const hexPrefix = extractUuid(id);
      const existingResult = await query(
        `SELECT * FROM payments WHERE REPLACE(id::text, '-', '') LIKE $1`,
        [`${hexPrefix}%`]
      );

      if (existingResult.rows.length === 0) {
        throw new Error('Payment not found');
      }

      const clauses = [];
      const params = [];

      if (input.payment_method !== undefined) {
        clauses.push(`payment_method = $${clauses.length + 1}`);
        params.push(input.payment_method);
      }

      if (input.payment_date !== undefined) {
        clauses.push(`payment_date = $${clauses.length + 1}`);
        params.push(input.payment_date);
      }

      if (input.notes !== undefined) {
        clauses.push(`notes = $${clauses.length + 1}`);
        params.push(input.notes);
      }

      if (clauses.length === 0) {
        const payment = existingResult.rows[0];
        return {
          ...toGidFormat(payment, 'Payment', { foreignKeys: ['customer_id'] }),
          total_amount: parseFloat(payment.total_amount),
        };
      }

      clauses.push('updated_at = NOW()');
      params.push(`${hexPrefix}%`);

      const result = await query(
        `UPDATE payments
         SET ${clauses.join(', ')}
         WHERE REPLACE(id::text, '-', '') LIKE $${params.length}
         RETURNING *`,
        params
      );

      const updated = result.rows[0];

      const invoiceLinks = await query(
        `SELECT DISTINCT invoice_id FROM payment_invoices WHERE payment_id = $1`,
        [updated.id]
      );
      await recalcInvoices(invoiceLinks.rows.map(row => row.invoice_id));

      return {
        ...toGidFormat(updated, 'Payment', { foreignKeys: ['customer_id'] }),
        total_amount: parseFloat(updated.total_amount),
      };
    },

    deletePayment: async (_, { id }, { user }) => {
      requireAuth(user);
      const hexPrefix = extractUuid(id);

      const paymentResult = await query(
        `SELECT * FROM payments WHERE REPLACE(id::text, '-', '') LIKE $1`,
        [`${hexPrefix}%`]
      );

      if (paymentResult.rows.length === 0) {
        throw new Error('Payment not found');
      }

      const payment = paymentResult.rows[0];
      const invoiceLinks = await query(
        `SELECT DISTINCT invoice_id FROM payment_invoices WHERE payment_id = $1`,
        [payment.id]
      );

      await query(
        `DELETE FROM payments WHERE REPLACE(id::text, '-', '') LIKE $1`,
        [`${hexPrefix}%`]
      );

      await recalcInvoices(invoiceLinks.rows.map(row => row.invoice_id));

      return true;
    },
  },
};
