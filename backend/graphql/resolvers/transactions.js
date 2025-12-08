import { query } from '../../config/database.js';
import { toGidFormat, toGidFormatArray } from '../../utils/resolverHelpers.js';
import { extractUuid } from '../../utils/gid.js';

const requireAuth = (user) => {
  if (!user) {
    throw new Error('Not authenticated');
  }
};

export const transactionResolvers = {
  Query: {
    transactions: async (_, { filters, limit = 50, offset = 0 }, { user }) => {
      requireAuth(user);

      let queryText = `
        SELECT t.*
        FROM transactions t
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 1;

      if (filters) {
        if (filters.start_date) {
          queryText += ` AND t.created_at >= $${paramCount}`;
          params.push(filters.start_date);
          paramCount++;
        }

        if (filters.end_date) {
          queryText += ` AND t.created_at <= $${paramCount}`;
          params.push(filters.end_date);
          paramCount++;
        }

        if (filters.employee_name) {
          queryText += ` AND t.employee_name ILIKE $${paramCount}`;
          params.push(`%${filters.employee_name}%`);
          paramCount++;
        }

        if (filters.transaction_type) {
          queryText += ` AND t.transaction_type = $${paramCount}`;
          params.push(filters.transaction_type);
          paramCount++;
        }

        if (filters.product_id) {
          const hexPrefix = extractUuid(filters.product_id);
          queryText += ` AND REPLACE(t.product_id::text, '-', '') LIKE $${paramCount}`;
          params.push(`${hexPrefix}%`);
          paramCount++;
        }
      }

      // Get total count for pagination
      const countQuery = queryText.replace('SELECT t.*', 'SELECT COUNT(*)');
      const countResult = await query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      queryText += ` ORDER BY t.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      params.push(limit, offset);

      const result = await query(queryText, params);
      const transactions = toGidFormatArray(result.rows, 'Transaction', { foreignKeys: ['product_id'] });

      return {
        transactions,
        total,
        page: Math.floor(offset / limit) + 1,
        limit
      };
    },

    transaction: async (_, { id }, { user }) => {
      requireAuth(user);
      const hexPrefix = extractUuid(id);
      const result = await query(
        `SELECT * FROM transactions WHERE REPLACE(id::text, '-', '') LIKE $1`,
        [`${hexPrefix}%`]
      );

      if (result.rows.length === 0) {
        throw new Error('Transaction not found');
      }

      return toGidFormat(result.rows[0], 'Transaction', { foreignKeys: ['product_id'] });
    },
  },

  Transaction: {
    product: async (parent) => {
      const hexPrefix = extractUuid(parent.product_id);
      const result = await query(
        `SELECT * FROM products WHERE REPLACE(id::text, '-', '') LIKE $1`,
        [`${hexPrefix}%`]
      );

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        ...toGidFormat(row, 'Product'),
        attributes: typeof row.attributes === 'string' ? JSON.parse(row.attributes) : row.attributes
      };
    },
  },

  TransactionWithProduct: {
    product: async (parent) => {
      const hexPrefix = extractUuid(parent.product_id);
      const result = await query(
        `SELECT * FROM products WHERE REPLACE(id::text, '-', '') LIKE $1`,
        [`${hexPrefix}%`]
      );

      if (result.rows.length === 0) {
        throw new Error('Product not found');
      }

      const row = result.rows[0];
      return {
        ...toGidFormat(row, 'Product'),
        attributes: typeof row.attributes === 'string' ? JSON.parse(row.attributes) : row.attributes
      };
    },
  },

  Mutation: {
    createTransaction: async (_, { input }, { user }) => {
      requireAuth(user);
      const {
        product_id,
        transaction_type,
        employee_name,
        amount_gallons,
        notes
      } = input;

      const productUuid = extractUuid(product_id);

      // Verify product exists
      const productCheck = await query(
        `SELECT id, amount_gallons FROM products WHERE REPLACE(id::text, '-', '') LIKE $1 AND deleted_at IS NULL`,
        [`${productUuid}%`]
      );

      if (productCheck.rows.length === 0) {
        throw new Error('Product not found');
      }

      const product = productCheck.rows[0];

      // Create transaction
      const result = await query(
        `INSERT INTO transactions (product_id, transaction_type, employee_name, amount_gallons, notes)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [product.id, transaction_type, employee_name, amount_gallons, notes]
      );

      // Update product amount based on transaction type
      let newAmount;
      if (transaction_type === 'check-in') {
        newAmount = parseFloat(product.amount_gallons) + parseFloat(amount_gallons);
      } else if (transaction_type === 'check-out') {
        newAmount = parseFloat(product.amount_gallons) - parseFloat(amount_gallons);
      } else {
        newAmount = product.amount_gallons;
      }

      // Update product status based on new amount
      let status = 'available';
      if (newAmount <= 0) {
        status = 'depleted';
      }

      await query(
        `UPDATE products
         SET amount_gallons = $1, status = $2, updated_at = NOW()
         WHERE id = $3`,
        [newAmount, status, product.id]
      );

      return toGidFormat(result.rows[0], 'Transaction', { foreignKeys: ['product_id'] });
    },

    deleteTransaction: async (_, { id }, { user }) => {
      requireAuth(user);
      const hexPrefix = extractUuid(id);

      // Get transaction details before deleting to reverse the product update
      const transactionCheck = await query(
        `SELECT * FROM transactions WHERE REPLACE(id::text, '-', '') LIKE $1`,
        [`${hexPrefix}%`]
      );

      if (transactionCheck.rows.length === 0) {
        throw new Error('Transaction not found');
      }

      const transaction = transactionCheck.rows[0];

      // Get current product amount
      const productCheck = await query(
        `SELECT amount_gallons FROM products WHERE id = $1`,
        [transaction.product_id]
      );

      if (productCheck.rows.length > 0) {
        const product = productCheck.rows[0];
        let newAmount;

        // Reverse the transaction
        if (transaction.transaction_type === 'check-in') {
          newAmount = parseFloat(product.amount_gallons) - parseFloat(transaction.amount_gallons);
        } else if (transaction.transaction_type === 'check-out') {
          newAmount = parseFloat(product.amount_gallons) + parseFloat(transaction.amount_gallons);
        } else {
          newAmount = product.amount_gallons;
        }

        // Update product status based on new amount
        let status = 'available';
        if (newAmount <= 0) {
          status = 'depleted';
        }

        await query(
          `UPDATE products
           SET amount_gallons = $1, status = $2, updated_at = NOW()
           WHERE id = $3`,
          [newAmount, status, transaction.product_id]
        );
      }

      // Delete the transaction
      const result = await query(
        `DELETE FROM transactions WHERE REPLACE(id::text, '-', '') LIKE $1 RETURNING id`,
        [`${hexPrefix}%`]
      );

      return true;
    },
  },
};
