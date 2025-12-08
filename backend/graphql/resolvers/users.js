import { query } from '../../config/database.js';
import { toGid, integerToUuidPrefix, parseGid } from '../../utils/gid.js';

const formatUser = (row) => {
  if (!row) return null;

  const name = row.first_name && row.last_name
    ? `${row.first_name} ${row.last_name}`
    : row.first_name || row.last_name || row.username;

  return {
    ...row,
    id: toGid('User', row.id),
    name,
  };
};

const requireAdmin = (ctxUser) => {
  if (!ctxUser || ctxUser.role !== 'admin') {
    throw new Error('Not authorized');
  }
};

const buildIdLikeParam = (id) => {
  if (!id) return null;

  if (id.startsWith('gid://')) {
    const { integerId } = parseGid(id);
    const hexPrefix = integerToUuidPrefix(integerId);
    return `${hexPrefix}%`;
  }

  // If we get the numeric portion of the GID (no prefix), convert it back to hex prefix
  if (/^\d+$/.test(id)) {
    const hexPrefix = integerToUuidPrefix(id);
    return `${hexPrefix}%`;
  }

  const cleaned = id.replace(/-/g, '');
  return `${cleaned}%`;
};

export const userResolvers = {
  Query: {
    users: async (_, { limit = 100, offset = 0 }, { user }) => {
      requireAdmin(user);

      const limitValue = Math.min(limit, 1000);
      const result = await query(
        `SELECT id, email, username, first_name, last_name, role, created_at, updated_at
         FROM users
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [limitValue, offset]
      );

      return result.rows.map(formatUser);
    },

    user: async (_, { id }, { user }) => {
      requireAdmin(user);

      const likeParam = buildIdLikeParam(id);
      const result = await query(
        `SELECT id, email, username, first_name, last_name, role, created_at, updated_at
         FROM users
         WHERE REPLACE(id::text, '-', '') LIKE $1
         LIMIT 1`,
        [likeParam]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return formatUser(result.rows[0]);
    },
  },

  Mutation: {
    updateUser: async (_, { id, input }, { user }) => {
      requireAdmin(user);

      const fields = [];
      const values = [];

      const allowedFields = ['email', 'username', 'first_name', 'last_name', 'role'];
      allowedFields.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(input, field) && input[field] !== undefined) {
          fields.push(`${field} = $${fields.length + 1}`);
          values.push(input[field]);
        }
      });

      if (fields.length === 0) {
        throw new Error('No fields provided to update');
      }

      fields.push(`updated_at = NOW()`);

      const likeParam = buildIdLikeParam(id);
      values.push(likeParam);

      const result = await query(
        `UPDATE users
         SET ${fields.join(', ')}
         WHERE REPLACE(id::text, '-', '') LIKE $${values.length}
         RETURNING id, email, username, first_name, last_name, role, created_at, updated_at`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return formatUser(result.rows[0]);
    },

    deleteUser: async (_, { id }, { user }) => {
      requireAdmin(user);

      const likeParam = buildIdLikeParam(id);
      const result = await query(
        `DELETE FROM users
         WHERE REPLACE(id::text, '-', '') LIKE $1
         RETURNING id`,
        [likeParam]
      );

      return result.rowCount > 0;
    },
  },
};
