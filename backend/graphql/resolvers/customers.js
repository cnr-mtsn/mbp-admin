import { query } from '../../config/database.js';
import { toGid, extractUuid } from '../../utils/gid.js';

const requireAuth = (user) => {
  if (!user) {
    throw new Error('Not authenticated');
  }
};

export const customerResolvers = {
  Customer: {
    invoices: async (parent, { first }, { user }) => {
      requireAuth(user);
      const customerId = extractUuid(parent.id);

      const limitClause = first ? `LIMIT $2` : '';
      const queryParams = first ? [`${customerId}%`, first] : [`${customerId}%`];

      const result = await query(
        `SELECT * FROM invoices
         WHERE REPLACE(customer_id::text, '-', '') LIKE $1
         ORDER BY created_at DESC
         ${limitClause}`,
        queryParams
      );

      return result.rows.map(row => ({
        ...row,
        id: toGid('Invoice', row.id),
        customer_id: toGid('Customer', row.customer_id),
        job_id: row.job_id ? toGid('Job', row.job_id) : null,
        estimate_id: row.estimate_id ? toGid('Estimate', row.estimate_id) : null,
      }));
    },

    jobs: async (parent, { first }, { user }) => {
      requireAuth(user);
      const customerId = extractUuid(parent.id);

      const limitClause = first ? `LIMIT $2` : '';
      const queryParams = first ? [`${customerId}%`, first] : [`${customerId}%`];

      const result = await query(
        `SELECT * FROM jobs
         WHERE REPLACE(customer_id::text, '-', '') LIKE $1
         ORDER BY created_at DESC
         ${limitClause}`,
        queryParams
      );

      return result.rows.map(row => ({
        ...row,
        id: toGid('Job', row.id),
        customer_id: toGid('Customer', row.customer_id),
        estimate_id: row.estimate_id ? toGid('Estimate', row.estimate_id) : null,
      }));
    },
  },

  Query: {
    customers: async (_, { first = 25, sortKey = 'recent_invoice' }, { user }) => {
      requireAuth(user);

      // Build ORDER BY clause based on sortKey
      let orderBy;
      let selectClause = `c.*,
        COUNT(CASE WHEN i.status IN ('sent', 'unpaid', 'overdue') THEN 1 END) as open_invoice_count,
        SUM(CASE WHEN i.status IN ('sent', 'unpaid', 'overdue') THEN i.total ELSE 0 END) as outstanding_balance`;
      let fromClause = 'customers c LEFT JOIN invoices i ON c.id = i.customer_id';

      switch (sortKey) {
        case 'name':
          orderBy = 'c.name ASC';
          break;
        case 'email':
          orderBy = 'c.email ASC NULLS LAST';
          break;
        case 'city':
          orderBy = 'c.city ASC NULLS LAST';
          break;
        case 'created_at':
          orderBy = 'c.created_at DESC';
          break;
        case 'open_invoices':
          // Sort by open invoice count (descending), then alphabetically for those with 0
          orderBy = 'open_invoice_count DESC, c.name ASC';
          break;
        case 'recent_invoice':
          // Join with invoices to get the most recent invoice date
          selectClause = `c.*,
            MAX(i.created_at) as latest_invoice_date,
            COUNT(CASE WHEN i.status IN ('sent', 'unpaid', 'overdue') THEN 1 END) as open_invoice_count,
            SUM(CASE WHEN i.status IN ('sent', 'unpaid', 'overdue') THEN i.total ELSE 0 END) as outstanding_balance`;
          orderBy = 'latest_invoice_date DESC NULLS LAST, c.name ASC';
          break;
        default:
          orderBy = 'c.name ASC'; // Default to name if invalid sortKey provided
      }

      // Always use GROUP BY since we're aggregating invoice data
      const sqlQuery = `SELECT ${selectClause} FROM ${fromClause} GROUP BY c.id ORDER BY ${orderBy} LIMIT $1`;

      const result = await query(sqlQuery, [first]);
      return result.rows.map(row => ({
        ...row,
        id: toGid('Customer', row.id),
        open_invoice_count: parseInt(row.open_invoice_count) || 0,
        outstanding_balance: parseFloat(row.outstanding_balance) || 0,
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
