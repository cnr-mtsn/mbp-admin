import { query } from '../../config/database.js';
import { toGid, extractUuid } from '../../utils/gid.js';

const requireAuth = (user) => {
  if (!user) {
    throw new Error('Not authenticated');
  }
};

export const customerResolvers = {
  Query: {
    customers: async (_, { first = 25, sortKey = 'name' }, { user }) => {
      requireAuth(user);

      // Build ORDER BY clause based on sortKey
      let orderBy;
      switch (sortKey) {
        case 'name':
          orderBy = 'name ASC';
          break;
        case 'email':
          orderBy = 'email ASC NULLS LAST';
          break;
        case 'city':
          orderBy = 'city ASC NULLS LAST';
          break;
        case 'created_at':
          orderBy = 'created_at DESC';
          break;
        default:
          orderBy = 'name ASC'; // Default to name if invalid sortKey provided
      }

      const result = await query(
        `SELECT * FROM customers ORDER BY ${orderBy} LIMIT $1`,
        [first]
      );
      return result.rows.map(row => ({
        ...row,
        id: toGid('Customer', row.id),
      }));
    },

    customer: async (_, { id }, { user }) => {
      requireAuth(user);
      const hexPrefix = extractUuid(id);
      const result = await query(
        `SELECT * FROM customers WHERE REPLACE(id::text, '-', '') LIKE $1`,
        [`${hexPrefix}%`]
      );

      if (result.rows.length === 0) {
        throw new Error('Customer not found');
      }

      return {
        ...result.rows[0],
        id: toGid('Customer', result.rows[0].id),
      };
    },
  },

  Mutation: {
    createCustomer: async (_, { input }, { user }) => {
      requireAuth(user);
      const { name, company_name, email, phone, address, city, state, zip } = input;

      const result = await query(
        `INSERT INTO customers (name, company_name, email, phone, address, city, state, zip)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [name, company_name, email, phone, address, city, state, zip]
      );

      return {
        ...result.rows[0],
        id: toGid('Customer', result.rows[0].id),
      };
    },

    updateCustomer: async (_, { id, input }, { user }) => {
      requireAuth(user);
      const hexPrefix = extractUuid(id);
      const { name, company_name, email, phone, address, city, state, zip } = input;

      const result = await query(
        `UPDATE customers
         SET name = $1, company_name = $2, email = $3, phone = $4, address = $5,
             city = $6, state = $7, zip = $8, updated_at = NOW()
         WHERE REPLACE(id::text, '-', '') LIKE $9
         RETURNING *`,
        [name, company_name, email, phone, address, city, state, zip, `${hexPrefix}%`]
      );

      if (result.rows.length === 0) {
        throw new Error('Customer not found');
      }

      return {
        ...result.rows[0],
        id: toGid('Customer', result.rows[0].id),
      };
    },

    deleteCustomer: async (_, { id }, { user }) => {
      requireAuth(user);
      const hexPrefix = extractUuid(id);
      const result = await query(
        `DELETE FROM customers WHERE REPLACE(id::text, '-', '') LIKE $1 RETURNING id`,
        [`${hexPrefix}%`]
      );

      if (result.rows.length === 0) {
        throw new Error('Customer not found');
      }

      return true;
    },
  },
};
