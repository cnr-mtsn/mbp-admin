import { query } from '../../config/database.js';
import { toGidFormat, extractUuidForQuery } from '../../utils/resolverHelpers.js';
import { toGid, extractUuid } from '../../utils/gid.js';

const requireAuth = (user) => {
  if (!user) {
    throw new Error('Not authenticated');
  }
};

export const expenseResolvers = {
  Query: {
    expenses: async (_, { status, job_id, first = 20, offset = 0 }, context) => {
      requireAuth(context.user);

      const conditions = [];
      const params = [];

      if (status) {
        conditions.push(`e.status = $${params.length + 1}`);
        params.push(status);
      }

      if (job_id) {
        const hexPrefix = extractUuid(job_id);
        conditions.push(`REPLACE(e.job_id::text, '-', '') LIKE $${params.length + 1}`);
        params.push(`${hexPrefix}%`);
      }

      const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      params.push(first, offset);

      const result = await query(
        `SELECT e.*
         FROM expenses e
         ${whereClause}
         ORDER BY e.invoice_date DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );

      return result.rows.map(row => {
        const expense = toGidFormat(row, 'Expense', { foreignKeys: ['job_id'] });
        return {
          ...expense,
          subtotal: row.subtotal ? parseFloat(row.subtotal) : null,
          tax: row.tax ? parseFloat(row.tax) : null,
          total: parseFloat(row.total),
          line_items: typeof row.line_items === 'string' ? JSON.parse(row.line_items) : row.line_items,
        };
      });
    },

    expense: async (_, { id }, context) => {
      requireAuth(context.user);

      const hexPrefix = extractUuid(id);
      const result = await query(
        `SELECT e.*
         FROM expenses e
         WHERE REPLACE(e.id::text, '-', '') LIKE $1`,
        [`${hexPrefix}%`]
      );

      if (result.rows.length === 0) {
        throw new Error('Expense not found');
      }

      const row = result.rows[0];
      const expense = toGidFormat(row, 'Expense', { foreignKeys: ['job_id'] });
      return {
        ...expense,
        subtotal: row.subtotal ? parseFloat(row.subtotal) : null,
        tax: row.tax ? parseFloat(row.tax) : null,
        total: parseFloat(row.total),
        line_items: typeof row.line_items === 'string' ? JSON.parse(row.line_items) : row.line_items,
      };
    },

    unassignedExpenses: async (_, { first = 20, offset = 0 }, context) => {
      requireAuth(context.user);

      const result = await query(
        `SELECT e.*
         FROM expenses e
         WHERE e.job_id IS NULL
         ORDER BY e.invoice_date DESC
         LIMIT $1 OFFSET $2`,
        [first, offset]
      );

      return result.rows.map(row => {
        const expense = toGidFormat(row, 'Expense', { foreignKeys: ['job_id'] });
        return {
          ...expense,
          subtotal: row.subtotal ? parseFloat(row.subtotal) : null,
          tax: row.tax ? parseFloat(row.tax) : null,
          total: parseFloat(row.total),
          line_items: typeof row.line_items === 'string' ? JSON.parse(row.line_items) : row.line_items,
        };
      });
    },
  },

  Mutation: {
    createExpense: async (_, { input }, context) => {
      requireAuth(context.user);

      const {
        job_id,
        expense_type = 'materials',
        vendor,
        invoice_number,
        invoice_date,
        po_number,
        description,
        line_items,
        subtotal,
        tax,
        total,
        notes,
        pdf_path,
        status = 'pending_review',
      } = input;

      // Convert job_id from GID to UUID if provided
      let jobUuid = null;
      if (job_id) {
        const hexPrefix = extractUuid(job_id);
        const jobResult = await query(
          `SELECT id FROM jobs WHERE REPLACE(id::text, '-', '') LIKE $1`,
          [`${hexPrefix}%`]
        );

        if (jobResult.rows.length === 0) {
          throw new Error('Job not found');
        }

        jobUuid = jobResult.rows[0].id;
      }

      const result = await query(
        `INSERT INTO expenses (
          job_id, expense_type, vendor, invoice_number, invoice_date, po_number,
          description, line_items, subtotal, tax, total, notes, pdf_path, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          jobUuid,
          expense_type,
          vendor,
          invoice_number,
          invoice_date,
          po_number,
          description,
          line_items ? JSON.stringify(line_items) : '[]',
          subtotal,
          tax,
          total,
          notes,
          pdf_path,
          status,
        ]
      );

      const row = result.rows[0];
      const expense = toGidFormat(row, 'Expense', { foreignKeys: ['job_id'] });
      return {
        ...expense,
        subtotal: row.subtotal ? parseFloat(row.subtotal) : null,
        tax: row.tax ? parseFloat(row.tax) : null,
        total: parseFloat(row.total),
        line_items: typeof row.line_items === 'string' ? JSON.parse(row.line_items) : row.line_items,
      };
    },

    updateExpense: async (_, { id, input }, context) => {
      requireAuth(context.user);

      const hexPrefix = extractUuid(id);

      // Get existing expense
      const existing = await query(
        `SELECT * FROM expenses WHERE REPLACE(id::text, '-', '') LIKE $1`,
        [`${hexPrefix}%`]
      );

      if (existing.rows.length === 0) {
        throw new Error('Expense not found');
      }

      const {
        job_id,
        expense_type,
        vendor,
        invoice_number,
        invoice_date,
        po_number,
        description,
        line_items,
        subtotal,
        tax,
        total,
        notes,
        status,
      } = input;

      // Convert job_id from GID to UUID if provided
      let jobUuid = job_id;
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

      // Build update query dynamically based on provided fields
      const updates = [];
      const params = [];
      let paramIndex = 1;

      if (job_id !== undefined) {
        updates.push(`job_id = $${paramIndex++}`);
        params.push(jobUuid);
      }
      if (expense_type !== undefined) {
        updates.push(`expense_type = $${paramIndex++}`);
        params.push(expense_type);
      }
      if (vendor !== undefined) {
        updates.push(`vendor = $${paramIndex++}`);
        params.push(vendor);
      }
      if (invoice_number !== undefined) {
        updates.push(`invoice_number = $${paramIndex++}`);
        params.push(invoice_number);
      }
      if (invoice_date !== undefined) {
        updates.push(`invoice_date = $${paramIndex++}`);
        params.push(invoice_date);
      }
      if (po_number !== undefined) {
        updates.push(`po_number = $${paramIndex++}`);
        params.push(po_number);
      }
      if (description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        params.push(description);
      }
      if (line_items !== undefined) {
        updates.push(`line_items = $${paramIndex++}`);
        params.push(JSON.stringify(line_items));
      }
      if (subtotal !== undefined) {
        updates.push(`subtotal = $${paramIndex++}`);
        params.push(subtotal);
      }
      if (tax !== undefined) {
        updates.push(`tax = $${paramIndex++}`);
        params.push(tax);
      }
      if (total !== undefined) {
        updates.push(`total = $${paramIndex++}`);
        params.push(total);
      }
      if (notes !== undefined) {
        updates.push(`notes = $${paramIndex++}`);
        params.push(notes);
      }
      if (status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        params.push(status);
      }

      updates.push(`updated_at = NOW()`);

      params.push(`${hexPrefix}%`);

      const result = await query(
        `UPDATE expenses
         SET ${updates.join(', ')}
         WHERE REPLACE(id::text, '-', '') LIKE $${paramIndex}
         RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        throw new Error('Expense not found');
      }

      const row = result.rows[0];
      const expense = toGidFormat(row, 'Expense', { foreignKeys: ['job_id'] });
      return {
        ...expense,
        subtotal: row.subtotal ? parseFloat(row.subtotal) : null,
        tax: row.tax ? parseFloat(row.tax) : null,
        total: parseFloat(row.total),
        line_items: typeof row.line_items === 'string' ? JSON.parse(row.line_items) : row.line_items,
      };
    },

    assignExpenseToJob: async (_, { expense_id, job_id }, context) => {
      requireAuth(context.user);

      const expenseHexPrefix = extractUuid(expense_id);
      const jobHexPrefix = extractUuid(job_id);

      // Verify job exists
      const jobResult = await query(
        `SELECT id FROM jobs WHERE REPLACE(id::text, '-', '') LIKE $1`,
        [`${jobHexPrefix}%`]
      );

      if (jobResult.rows.length === 0) {
        throw new Error('Job not found');
      }

      const jobUuid = jobResult.rows[0].id;

      // Update expense
      const result = await query(
        `UPDATE expenses
         SET job_id = $1, status = 'assigned', updated_at = NOW()
         WHERE REPLACE(id::text, '-', '') LIKE $2
         RETURNING *`,
        [jobUuid, `${expenseHexPrefix}%`]
      );

      if (result.rows.length === 0) {
        throw new Error('Expense not found');
      }

      const row = result.rows[0];
      const expense = toGidFormat(row, 'Expense', { foreignKeys: ['job_id'] });
      return {
        ...expense,
        subtotal: row.subtotal ? parseFloat(row.subtotal) : null,
        tax: row.tax ? parseFloat(row.tax) : null,
        total: parseFloat(row.total),
        line_items: typeof row.line_items === 'string' ? JSON.parse(row.line_items) : row.line_items,
      };
    },

    deleteExpense: async (_, { id }, context) => {
      requireAuth(context.user);

      const hexPrefix = extractUuid(id);
      const result = await query(
        `DELETE FROM expenses WHERE REPLACE(id::text, '-', '') LIKE $1 RETURNING id`,
        [`${hexPrefix}%`]
      );

      if (result.rows.length === 0) {
        throw new Error('Expense not found');
      }

      return true;
    },
  },

  Expense: {
    job: async (parent, _, context) => {
      if (!parent.job_id) return null;

      const hexPrefix = extractUuid(parent.job_id);
      const result = await query(
        `SELECT * FROM jobs WHERE REPLACE(id::text, '-', '') LIKE $1`,
        [`${hexPrefix}%`]
      );

      if (result.rows.length === 0) return null;

      return toGidFormat(result.rows[0], 'Job', { foreignKeys: ['customer_id', 'estimate_id'] });
    },

    line_items: (parent) => {
      if (!parent.line_items) return [];
      return typeof parent.line_items === 'string'
        ? JSON.parse(parent.line_items)
        : parent.line_items;
    },
  },

  Job: {
    expenses: async (parent, _, context) => {
      const hexPrefix = extractUuid(parent.id);
      const result = await query(
        `SELECT * FROM expenses WHERE REPLACE(job_id::text, '-', '') LIKE $1 ORDER BY invoice_date DESC, created_at DESC`,
        [`${hexPrefix}%`]
      );

      return result.rows.map(row => {
        const expense = toGidFormat(row, 'Expense', { foreignKeys: ['job_id'] });
        return {
          ...expense,
          subtotal: row.subtotal ? parseFloat(row.subtotal) : null,
          tax: row.tax ? parseFloat(row.tax) : null,
          total: parseFloat(row.total),
          line_items: typeof row.line_items === 'string' ? JSON.parse(row.line_items) : row.line_items,
        };
      });
    },

    total_expenses: async (parent, _, context) => {
      const hexPrefix = extractUuid(parent.id);
      const result = await query(
        `SELECT COALESCE(SUM(total), 0) as total_expenses
         FROM expenses
         WHERE REPLACE(job_id::text, '-', '') LIKE $1`,
        [`${hexPrefix}%`]
      );

      return parseFloat(result.rows[0].total_expenses);
    },

    net_profit: async (parent, _, context) => {
      const hexPrefix = extractUuid(parent.id);

      // Get total expenses
      const expensesResult = await query(
        `SELECT COALESCE(SUM(total), 0) as total_expenses
         FROM expenses
         WHERE REPLACE(job_id::text, '-', '') LIKE $1`,
        [`${hexPrefix}%`]
      );

      const totalExpenses = parseFloat(expensesResult.rows[0].total_expenses);
      const amountPaid = parseFloat(parent.amount_paid || 0);

      return amountPaid - totalExpenses;
    },
  },
};
