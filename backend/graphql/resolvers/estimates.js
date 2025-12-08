import { query } from '../../config/database.js';
import { toGidFormat, toGidFormatArray } from '../../utils/resolverHelpers.js';
import { extractUuid } from '../../utils/gid.js';

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
        `UPDATE estimates
         SET customer_id = $1, title = $2, description = $3, line_items = $4,
             subtotal = $5, tax = $6, total = $7, notes = $8, status = $9, updated_at = NOW()
         WHERE REPLACE(id::text, '-', '') LIKE $10
         RETURNING *`,
        [customerUuid, title, description, JSON.stringify(line_items || []), subtotal, tax, total, notes, status, `${hexPrefix}%`]
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
  },
};
