import { query } from '../../config/database.js';
import { toGidFormat, toGidFormatArray } from '../../utils/resolverHelpers.js';
import { extractUuid } from '../../utils/gid.js';
import { v4 as uuidv4 } from 'uuid';

const requireAuth = (user) => {
  if (!user) {
    throw new Error('Not authenticated');
  }
};

export const productResolvers = {
  Query: {
    products: async (_, { filters, limit = 50, offset = 0 }, { user }) => {
      requireAuth(user);

      let queryText = `
        SELECT p.*,
               (SELECT COUNT(*) FROM transactions WHERE product_id = p.id) as transaction_count
        FROM products p
        WHERE deleted_at IS NULL
      `;
      const params = [];
      let paramCount = 1;

      if (filters) {
        if (filters.product_type) {
          queryText += ` AND product_type = $${paramCount}`;
          params.push(filters.product_type);
          paramCount++;
        }

        if (filters.category) {
          queryText += ` AND category = $${paramCount}`;
          params.push(filters.category);
          paramCount++;
        }

        if (filters.brand) {
          queryText += ` AND brand ILIKE $${paramCount}`;
          params.push(`%${filters.brand}%`);
          paramCount++;
        }

        if (filters.color) {
          queryText += ` AND color ILIKE $${paramCount}`;
          params.push(`%${filters.color}%`);
          paramCount++;
        }

        if (filters.status) {
          queryText += ` AND status = $${paramCount}`;
          params.push(filters.status);
          paramCount++;
        }

        if (filters.search) {
          queryText += ` AND (
            brand ILIKE $${paramCount} OR
            color ILIKE $${paramCount} OR
            color_code ILIKE $${paramCount} OR
            category ILIKE $${paramCount}
          )`;
          params.push(`%${filters.search}%`);
          paramCount++;
        }
      }

      queryText += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      params.push(limit, offset);

      const result = await query(queryText, params);
      return toGidFormatArray(result.rows, 'Product').map(row => ({
        ...row,
        attributes: typeof row.attributes === 'string' ? JSON.parse(row.attributes) : row.attributes
      }));
    },

    product: async (_, { id }, { user }) => {
      requireAuth(user);
      const hexPrefix = extractUuid(id);
      const result = await query(
        `SELECT p.*,
                (SELECT COUNT(*) FROM transactions WHERE product_id = p.id) as transaction_count
         FROM products p
         WHERE REPLACE(p.id::text, '-', '') LIKE $1 AND deleted_at IS NULL`,
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

    productByQR: async (_, { qr_code }, { user }) => {
      requireAuth(user);
      const result = await query(
        `SELECT p.*,
                (SELECT COUNT(*) FROM transactions WHERE product_id = p.id) as transaction_count
         FROM products p
         WHERE id::text = $1 AND deleted_at IS NULL`,
        [qr_code]
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

  Product: {
    transactions: async (parent) => {
      const hexPrefix = extractUuid(parent.id);
      const result = await query(
        `SELECT * FROM transactions
         WHERE REPLACE(product_id::text, '-', '') LIKE $1
         ORDER BY created_at DESC`,
        [`${hexPrefix}%`]
      );
      return toGidFormatArray(result.rows, 'Transaction', { foreignKeys: ['product_id'] });
    },

    last_transaction: async (parent) => {
      const hexPrefix = extractUuid(parent.id);
      const result = await query(
        `SELECT * FROM transactions
         WHERE REPLACE(product_id::text, '-', '') LIKE $1
         ORDER BY created_at DESC LIMIT 1`,
        [`${hexPrefix}%`]
      );

      if (result.rows.length === 0) return null;

      return toGidFormat(result.rows[0], 'Transaction', { foreignKeys: ['product_id'] });
    },
  },

  Mutation: {
    createProduct: async (_, { input }, { user }) => {
      requireAuth(user);
      const {
        product_type,
        category,
        brand,
        color,
        color_code,
        sheen,
        container_size,
        amount_gallons = 0,
        attributes = {},
        status = 'available'
      } = input;

      const productId = uuidv4();

      const result = await query(
        `INSERT INTO products (
          id, product_type, category, brand, color, color_code, sheen,
          container_size, amount_gallons, attributes, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          productId,
          product_type,
          category,
          brand,
          color,
          color_code,
          sheen,
          container_size,
          amount_gallons,
          JSON.stringify(attributes),
          status
        ]
      );

      const row = result.rows[0];
      return {
        ...toGidFormat(row, 'Product'),
        attributes: typeof row.attributes === 'string' ? JSON.parse(row.attributes) : row.attributes
      };
    },

    updateProduct: async (_, { id, input }, { user }) => {
      requireAuth(user);
      const hexPrefix = extractUuid(id);

      // Build dynamic update query
      const updates = [];
      const params = [];
      let paramCount = 1;

      const allowedFields = [
        'product_type', 'category', 'brand', 'color', 'color_code',
        'sheen', 'container_size', 'amount_gallons', 'attributes', 'status'
      ];

      allowedFields.forEach(field => {
        if (input[field] !== undefined) {
          if (field === 'attributes') {
            updates.push(`${field} = $${paramCount}`);
            params.push(JSON.stringify(input[field]));
          } else {
            updates.push(`${field} = $${paramCount}`);
            params.push(input[field]);
          }
          paramCount++;
        }
      });

      if (updates.length === 0) {
        throw new Error('No fields to update');
      }

      updates.push(`updated_at = NOW()`);
      params.push(`${hexPrefix}%`);

      const result = await query(
        `UPDATE products
         SET ${updates.join(', ')}
         WHERE REPLACE(id::text, '-', '') LIKE $${paramCount} AND deleted_at IS NULL
         RETURNING *`,
        params
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

    deleteProduct: async (_, { id }, { user }) => {
      requireAuth(user);
      const hexPrefix = extractUuid(id);

      // Soft delete by setting deleted_at
      const result = await query(
        `UPDATE products
         SET deleted_at = NOW()
         WHERE REPLACE(id::text, '-', '') LIKE $1 AND deleted_at IS NULL
         RETURNING id`,
        [`${hexPrefix}%`]
      );

      if (result.rows.length === 0) {
        throw new Error('Product not found');
      }

      return true;
    },

    restoreProduct: async (_, { id }, { user }) => {
      requireAuth(user);
      const hexPrefix = extractUuid(id);

      const result = await query(
        `UPDATE products
         SET deleted_at = NULL, status = 'available', updated_at = NOW()
         WHERE REPLACE(id::text, '-', '') LIKE $1
         RETURNING *`,
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

    depleteProduct: async (_, { id }, { user }) => {
      requireAuth(user);
      const hexPrefix = extractUuid(id);

      const result = await query(
        `UPDATE products
         SET status = 'depleted', depleted_at = NOW(), updated_at = NOW()
         WHERE REPLACE(id::text, '-', '') LIKE $1 AND deleted_at IS NULL
         RETURNING *`,
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
};
