import { query } from '../../config/database.js';
import { toGid, extractUuid } from '../../utils/gid.js';

const requireAuth = (user) => {
  if (!user) {
    throw new Error('Not authenticated');
  }
};

export const serviceResolvers = {
  Query: {
    services: async (_, { search }, { user }) => {
      requireAuth(user);

      let queryText;
      let params;

      if (search) {
        // Search by name (case-insensitive)
        queryText = `
          SELECT * FROM services
          WHERE name ILIKE $1
          ORDER BY name ASC
          LIMIT 50
        `;
        params = [`%${search}%`];
      } else {
        // Return all services if no search term
        queryText = 'SELECT * FROM services ORDER BY name ASC LIMIT 100';
        params = [];
      }

      const result = await query(queryText, params);
      return result.rows.map(row => ({
        ...row,
        id: toGid('Service', row.id),
      }));
    },

    service: async (_, { id }, { user }) => {
      requireAuth(user);
      const hexPrefix = extractUuid(id);
      const result = await query(
        `SELECT * FROM services WHERE REPLACE(id::text, '-', '') LIKE $1`,
        [`${hexPrefix}%`]
      );

      if (result.rows.length === 0) {
        throw new Error('Service not found');
      }

      return {
        ...result.rows[0],
        id: toGid('Service', result.rows[0].id),
      };
    },
  },
};
