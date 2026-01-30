import { query } from '../../config/database.js';
import { toGidFormat, toGidFormatArray } from '../../utils/resolverHelpers.js';
import { extractUuid } from '../../utils/gid.js';
import { getEstimateEmailPreview, sendEstimateEmail } from '../../services/emailService.js';

const requireAuth = (user) => {
  if (!user) {
    throw new Error('Not authenticated');
  }
};

export const estimateResolvers = {
  Query: {
    estimates: async (_, __, { user }) => {
      requireAuth(user);
      const result = await query(
        'SELECT * FROM estimates ORDER BY created_at DESC'
      );
      return toGidFormatArray(result.rows, 'Estimate', { foreignKeys: ['customer_id'] }).map(row => ({
        ...row,
        line_items: typeof row.line_items === 'string' ? JSON.parse(row.line_items) : row.line_items
      }));
    },

    estimate: async (_, { id }, { user }) => {
      requireAuth(user);
      const hexPrefix = extractUuid(id);
      const result = await query(
        `SELECT * FROM estimates WHERE REPLACE(id::text, '-', '') LIKE $1`,
        [`${hexPrefix}%`]
      );

      if (result.rows.length === 0) {
        throw new Error('Estimate not found');
      }

      const estimate = toGidFormat(result.rows[0], 'Estimate', { foreignKeys: ['customer_id'] });
      return {
        ...estimate,
        line_items: typeof estimate.line_items === 'string' ? JSON.parse(estimate.line_items) : estimate.line_items
      };
    },

    previewEstimateEmail: async (_, { id }, { user }) => {
      requireAuth(user);
      const hexPrefix = extractUuid(id);

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
        throw new Error('Estimate not found');
      }

      const estimate = estimateResult.rows[0];
      estimate.line_items = typeof estimate.line_items === 'string' ? JSON.parse(estimate.line_items) : estimate.line_items;

      return getEstimateEmailPreview(estimate);
    },
  },

  Estimate: {
    customer: async (parent) => {
      const hexPrefix = extractUuid(parent.customer_id);
      const result = await query(
        `SELECT * FROM customers WHERE REPLACE(id::text, '-', '') LIKE $1`,
        [`${hexPrefix}%`]
      );
      return toGidFormat(result.rows[0], 'Customer');
    },
  },

  Mutation: {
    createEstimate: async (_, { input }, { user }) => {
      requireAuth(user);
      const { customer_id, title, description, line_items, subtotal, tax, total, notes, status } = input;

      // Get full UUID from the database
      const customerHexPrefix = extractUuid(customer_id);
      const customerResult = await query(
        `SELECT id FROM customers WHERE REPLACE(id::text, '-', '') LIKE $1`,
        [`${customerHexPrefix}%`]
      );

      if (customerResult.rows.length === 0) {
        throw new Error('Customer not found');
      }

      const customerUuid = customerResult.rows[0].id;

      const result = await query(
        `INSERT INTO estimates (customer_id, title, description, line_items, subtotal, tax, total, notes, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [customerUuid, title, description, JSON.stringify(line_items || []), subtotal, tax, total, notes, status || 'draft']
      );

      const estimate = toGidFormat(result.rows[0], 'Estimate', { foreignKeys: ['customer_id'] });
      return {
        ...estimate,
        line_items: typeof estimate.line_items === 'string' ? JSON.parse(estimate.line_items) : estimate.line_items
      };
    },

    updateEstimate: async (_, { id, input }, { user }) => {
      requireAuth(user);
      const hexPrefix = extractUuid(id);

      // Build the update fields dynamically based on what's provided
      const updates = [];
      const values = [];
      let paramCount = 1;

      // Handle customer_id if provided
      if (input.customer_id !== undefined) {
        const customerHexPrefix = extractUuid(input.customer_id);
        const customerResult = await query(
          `SELECT id FROM customers WHERE REPLACE(id::text, '-', '') LIKE $1`,
          [`${customerHexPrefix}%`]
        );

        if (customerResult.rows.length === 0) {
          throw new Error('Customer not found');
        }

        updates.push(`customer_id = $${paramCount}`);
        values.push(customerResult.rows[0].id);
        paramCount++;
      }

      if (input.title !== undefined) {
        updates.push(`title = $${paramCount}`);
        values.push(input.title);
        paramCount++;
      }

      if (input.description !== undefined) {
        updates.push(`description = $${paramCount}`);
        values.push(input.description);
        paramCount++;
      }

      if (input.line_items !== undefined) {
        updates.push(`line_items = $${paramCount}`);
        values.push(JSON.stringify(input.line_items || []));
        paramCount++;
      }

      if (input.subtotal !== undefined) {
        updates.push(`subtotal = $${paramCount}`);
        values.push(input.subtotal);
        paramCount++;
      }

      if (input.tax !== undefined) {
        updates.push(`tax = $${paramCount}`);
        values.push(input.tax);
        paramCount++;
      }

      if (input.total !== undefined) {
        updates.push(`total = $${paramCount}`);
        values.push(input.total);
        paramCount++;
      }

      if (input.notes !== undefined) {
        updates.push(`notes = $${paramCount}`);
        values.push(input.notes);
        paramCount++;
      }

      if (input.status !== undefined) {
        updates.push(`status = $${paramCount}`);
        values.push(input.status);
        paramCount++;
      }

      // Always update the updated_at timestamp
      updates.push('updated_at = NOW()');

      if (updates.length === 1) {
        // Only updated_at, no actual changes
        throw new Error('No fields to update');
      }

      // Add the WHERE clause parameter
      values.push(`${hexPrefix}%`);

      const result = await query(
        `UPDATE estimates
         SET ${updates.join(', ')}
         WHERE REPLACE(id::text, '-', '') LIKE $${paramCount}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('Estimate not found');
      }

      const estimate = toGidFormat(result.rows[0], 'Estimate', { foreignKeys: ['customer_id'] });
      return {
        ...estimate,
        line_items: typeof estimate.line_items === 'string' ? JSON.parse(estimate.line_items) : estimate.line_items
      };
    },

    deleteEstimate: async (_, { id }, { user }) => {
      requireAuth(user);
      const hexPrefix = extractUuid(id);
      const result = await query(
        `DELETE FROM estimates WHERE REPLACE(id::text, '-', '') LIKE $1 RETURNING id`,
        [`${hexPrefix}%`]
      );

      if (result.rows.length === 0) {
        throw new Error('Estimate not found');
      }

      return true;
    },

    sendEstimate: async (_, { id, recipientEmail, ccEmails, subject, body }, { user }) => {
      requireAuth(user);
      const hexPrefix = extractUuid(id);

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
        throw new Error('Estimate not found');
      }

      const estimate = estimateResult.rows[0];
      estimate.line_items = typeof estimate.line_items === 'string' ? JSON.parse(estimate.line_items) : estimate.line_items;

      // Validate customer email exists (or recipientEmail provided)
      if (!estimate.customer_email && !recipientEmail) {
        throw new Error('No recipient email address available. Please provide a recipient email or add an email to the customer.');
      }

      // Send email
      const options = {};
      if (recipientEmail) options.recipientEmail = recipientEmail;
      if (ccEmails) options.ccEmails = ccEmails;
      if (subject) options.subject = subject;
      if (body) options.body = body;

      await sendEstimateEmail(estimate, options);

      // Update estimate status from draft to sent if applicable
      if (estimate.status === 'draft') {
        await query(
          `UPDATE estimates SET status = 'sent', updated_at = NOW()
           WHERE REPLACE(id::text, '-', '') LIKE $1`,
          [`${hexPrefix}%`]
        );
      }

      return true;
    },
  },
};
