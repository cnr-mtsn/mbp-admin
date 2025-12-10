import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../../config/database.js';
import { toGid, extractUuid } from '../../utils/gid.js';

export const authResolvers = {
  Query: {
    me: async (_, __, { user }) => {
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Convert user.id to string to handle both string and object types
      const userIdString = String(user.id);

      // Extract UUID from GID if it's in GID format, otherwise use as-is for backward compatibility
      const uuid = userIdString.startsWith('gid://') ? extractUuid(userIdString) : userIdString;

      // Query the database directly by UUID (no need for partial matching)
      const result = await query(
        `SELECT id, email, username, first_name, last_name, role, created_at FROM users WHERE id = $1`,
        [uuid]
      );

      if (result.rows.length === 0) {
        throw new Error('Not authenticated');
      }

      const userData = result.rows[0];
      // Combine first_name and last_name for the name field, fallback to username
      const name = userData.first_name && userData.last_name
        ? `${userData.first_name} ${userData.last_name}`
        : userData.first_name || userData.last_name || userData.username;

      return {
        ...userData,
        id: toGid('User', userData.id),
        name
      };
    },
  },

  Mutation: {
    register: async (_, { email, password, name }, { isBillingRequest }) => {
      if (isBillingRequest) {
        throw new Error('Registration is disabled for billing');
      }
      const existingUser = await query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        throw new Error('User already exists');
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      // Use username same as email prefix, and password_hash to match inventory schema
      const username = email.split('@')[0];

      const result = await query(
        'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, email, username, role, created_at',
        [username, email, hashedPassword, 'user']
      );

      const user = result.rows[0];
      const gid = toGid('User', user.id);
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return {
        user: {
          ...user,
          id: gid,
          name: user.username
        },
        token
      };
    },

    login: async (_, { username, password }, { isBillingRequest }) => {
      const result = await query(
        'SELECT id, email, password_hash, username, first_name, last_name, role, created_at FROM users WHERE username = $1',
        [username]
      );

      if (result.rows.length === 0) {
        throw new Error('Invalid credentials');
      }

      const user = result.rows[0];
      const validPassword = await bcrypt.compare(password, user.password_hash);

      if (!validPassword) {
        throw new Error('Invalid credentials');
      }

      if (isBillingRequest && user.role !== 'admin') {
        throw new Error('Only admin users can access billing');
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      const { password_hash, ...userWithoutPassword } = user;
      // Combine first_name and last_name for the name field, fallback to username
      const name = user.first_name && user.last_name
        ? `${user.first_name} ${user.last_name}`
        : user.first_name || user.last_name || user.username;

      return {
        user: {
          ...userWithoutPassword,
          id: toGid('User', user.id),
          name
        },
        token
      };
    },
  },
};
