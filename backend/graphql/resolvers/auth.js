import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query } from '../../config/database.js';
import { toGid, extractUuid } from '../../utils/gid.js';
import { sendPasswordResetEmail, sendVerificationEmail } from '../../services/emailService.js';

// Rate limiting for password reset attempts
const resetAttempts = new Map();

// Cleanup old rate limit entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [email, attempt] of resetAttempts.entries()) {
    if (now > attempt.resetAt) {
      resetAttempts.delete(email);
    }
  }
}, 60 * 60 * 1000);

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
        `SELECT id, email, username, first_name, last_name, role, email_verified, created_at FROM users WHERE id = $1`,
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
        name,
        email_verified: userData.email_verified || false
      };
    },
  },

  Mutation: {
    register: async (_, { email, password, name }) => {
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
        'INSERT INTO users (username, email, password_hash, role, email_verified) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, username, role, email_verified, created_at',
        [username, email, hashedPassword, 'user', false]
      );

      const user = result.rows[0];
      const gid = toGid('User', user.id);
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Send verification email (non-blocking)
      try {
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = await bcrypt.hash(verificationToken, 10);
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        await query(
          'UPDATE users SET verification_token = $1, verification_token_expires = $2 WHERE id = $3',
          [hashedToken, expiresAt, user.id]
        );

        const userName = user.username || 'User';
        await sendVerificationEmail(user.email, verificationToken, userName);
      } catch (error) {
        console.error('Failed to send verification email:', error);
        // Don't block registration if email fails
      }

      return {
        user: {
          ...user,
          id: gid,
          name: user.username,
          email_verified: false
        },
        token
      };
    },

    login: async (_, { username, password }, { isBillingRequest }) => {
      const result = await query(
        'SELECT id, email, password_hash, username, first_name, last_name, role, email_verified, created_at FROM users WHERE username = $1',
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

      if (isBillingRequest && user.role !== 'admin' && user.role !== 'superadmin') {
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
          name,
          email_verified: user.email_verified || false
        },
        token
      };
    },

    forgotPassword: async (_, { email }) => {
      console.log('=== FORGOT PASSWORD REQUEST ===');
      console.log('Email requested:', email);

      try {
        // Rate limiting check
        const now = Date.now();
        const attempt = resetAttempts.get(email);

        if (attempt && attempt.count >= 3 && now < attempt.resetAt) {
          console.log('Rate limit exceeded for:', email);
          throw new Error('Too many password reset attempts. Please try again later.');
        }

        // Update rate limiting
        if (attempt && now < attempt.resetAt) {
          resetAttempts.set(email, { count: attempt.count + 1, resetAt: attempt.resetAt });
        } else {
          resetAttempts.set(email, { count: 1, resetAt: now + 60 * 60 * 1000 });
        }

        // Find user by email
        console.log('Searching for user with email:', email);
        const result = await query(
          'SELECT id, email, first_name, last_name, username FROM users WHERE email = $1',
          [email]
        );

        console.log('Users found:', result.rows.length);

        // If user exists, generate token and send email
        if (result.rows.length > 0) {
          const user = result.rows[0];

          // Generate secure token (32 bytes = 64 hex characters)
          const rawToken = crypto.randomBytes(32).toString('hex');
          console.log(`Generated reset token for ${user.email}, length: ${rawToken.length}`);

          // Hash token before storing
          const hashedToken = await bcrypt.hash(rawToken, 10);

          // Store hashed token and expiration (1 hour from now)
          const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
          await query(
            'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
            [hashedToken, expiresAt, user.id]
          );

          console.log(`Stored hashed token for ${user.email}, expires: ${expiresAt}`);

          // Send email with raw token
          const userName = user.first_name || user.username || 'User';
          await sendPasswordResetEmail(user.email, rawToken, userName);
        }

        // Always return true to prevent email enumeration
        console.log('Forgot password request completed successfully');
        return true;
      } catch (error) {
        // If it's a rate limiting error, rethrow it
        if (error.message.includes('Too many password reset attempts')) {
          console.log('Throwing rate limit error');
          throw error;
        }
        // Log other errors but still return true to prevent email enumeration
        console.error('Error in forgotPassword:', error);
        console.log('Returning true despite error (email enumeration protection)');
        return true;
      }
    },

    resetPassword: async (_, { token, newPassword }) => {
      // Validate password strength
      if (newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      console.log('Reset password attempt - Token length:', token?.length);

      // Find all users with non-expired reset tokens
      const result = await query(
        'SELECT id, email, reset_token FROM users WHERE reset_token_expires > NOW() AND reset_token IS NOT NULL'
      );

      console.log('Users with active reset tokens:', result.rows.length);

      // Compare provided token against each hashed token
      let matchedUser = null;
      for (const user of result.rows) {
        console.log(`Comparing token for user ${user.email}...`);
        const isMatch = await bcrypt.compare(token, user.reset_token);
        console.log(`Token match for ${user.email}:`, isMatch);
        if (isMatch) {
          matchedUser = user;
          break;
        }
      }

      if (!matchedUser) {
        console.log('No matching user found - token invalid or expired');
        throw new Error('Invalid or expired reset token');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password and clear reset fields
      await query(
        'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
        [hashedPassword, matchedUser.id]
      );

      return true;
    },

    sendVerificationEmail: async (_, __, { user }) => {
      console.log('=== SEND VERIFICATION EMAIL REQUEST ===');

      if (!user) {
        throw new Error('Not authenticated');
      }

      try {
        const userIdString = String(user.id);
        const uuid = userIdString.startsWith('gid://') ? extractUuid(userIdString) : userIdString;

        // Find user
        const result = await query(
          'SELECT id, email, username, first_name, email_verified FROM users WHERE id = $1',
          [uuid]
        );

        if (result.rows.length === 0) {
          throw new Error('User not found');
        }

        const dbUser = result.rows[0];

        // Check if already verified
        if (dbUser.email_verified) {
          throw new Error('Email already verified');
        }

        // Generate secure token
        const rawToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = await bcrypt.hash(rawToken, 10);

        // Store hashed token and expiration (24 hours)
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await query(
          'UPDATE users SET verification_token = $1, verification_token_expires = $2 WHERE id = $3',
          [hashedToken, expiresAt, dbUser.id]
        );

        console.log(`Stored verification token for ${dbUser.email}, expires: ${expiresAt}`);

        // Send email with raw token
        const userName = dbUser.first_name || dbUser.username || 'User';
        await sendVerificationEmail(dbUser.email, rawToken, userName);

        console.log('Verification email sent successfully');
        return true;
      } catch (error) {
        console.error('Error in sendVerificationEmail:', error);
        throw error;
      }
    },

    verifyEmail: async (_, { token }) => {
      console.log('=== VERIFY EMAIL REQUEST ===');
      console.log('Token length:', token?.length);

      // Find all users with non-expired verification tokens
      const result = await query(
        'SELECT id, email, verification_token FROM users WHERE verification_token_expires > NOW() AND verification_token IS NOT NULL'
      );

      console.log('Users with active verification tokens:', result.rows.length);

      // Compare provided token against each hashed token
      let matchedUser = null;
      for (const user of result.rows) {
        const isMatch = await bcrypt.compare(token, user.verification_token);
        if (isMatch) {
          matchedUser = user;
          break;
        }
      }

      if (!matchedUser) {
        console.log('No matching user found - token invalid or expired');
        throw new Error('Invalid or expired verification token');
      }

      // Update user as verified and clear verification fields
      await query(
        'UPDATE users SET email_verified = TRUE, verification_token = NULL, verification_token_expires = NULL WHERE id = $1',
        [matchedUser.id]
      );

      console.log(`Email verified successfully for ${matchedUser.email}`);
      return true;
    },
  },
};
