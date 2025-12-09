import { query } from '../../config/database.js';
import { toGidFormat, toGidFormatArray } from '../../utils/resolverHelpers.js';
import { toGid, extractUuid } from '../../utils/gid.js';

const requireAuth = (user) => {
  if (!user) {
    throw new Error('Not authenticated');
  }
};

export const paymentResolvers = {
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
          line_items: typeof row.line_items === 'string' ? JSON.parse(row.line_items) : row.line_items
        }
      }));
    },
  },

  Mutation: {
    recordPayment: async (_, { input }, { user }) => {
      requireAuth(user);

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
          notes
        ]
      );

      const payment = paymentResult.rows[0];

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

        // Create payment_invoice record
        await query(
          `INSERT INTO payment_invoices (payment_id, invoice_id, amount_applied)
           VALUES ($1, $2, $3)`,
          [payment.id, invoiceUuid, amountApplied]
        );

        // Update invoice status to paid and set paid_date
        // Only mark as fully paid if amount applied equals invoice total
        const isPaid = Math.abs(amountApplied - invoiceTotal) < 0.01;

        if (isPaid) {
          await query(
            `UPDATE invoices
             SET status = 'paid',
                 paid_date = $1,
                 payment_method = $2,
                 updated_at = NOW()
             WHERE id = $3`,
            [payment_date || new Date().toISOString(), payment_method, invoiceUuid]
          );

          // Update job status if all invoices are paid
          const jobCheckResult = await query(
            `SELECT job_id FROM invoices WHERE id = $1`,
            [invoiceUuid]
          );

          if (jobCheckResult.rows[0].job_id) {
            const jobId = jobCheckResult.rows[0].job_id;

            const jobInvoicesResult = await query(
              `SELECT COUNT(*) as total_invoices,
                      COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_invoices
               FROM invoices
               WHERE job_id = $1`,
              [jobId]
            );

            const { total_invoices, paid_invoices } = jobInvoicesResult.rows[0];

            if (parseInt(total_invoices) > 0 && parseInt(total_invoices) === parseInt(paid_invoices)) {
              await query(
                `UPDATE jobs
                 SET status = 'paid', updated_at = NOW()
                 WHERE id = $1 AND status != 'paid'`,
                [jobId]
              );
            }
          }
        }
      }

      return toGidFormat(payment, 'Payment', { foreignKeys: ['customer_id'] });
    },
  },
};
