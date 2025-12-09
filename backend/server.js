import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import jwt from 'jsonwebtoken';
import { typeDefs } from './graphql/schema/typeDefs.js';
import { resolvers } from './graphql/resolvers/index.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Apollo Server setup with introspection and playground enabled
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true, // Enable GraphQL introspection in production
  plugins: [
    // Enable GraphQL Playground in production
    {
      async serverWillStart() {
        console.log('🎮 GraphQL Playground available at /graphql');
      },
    },
  ],
});

// Context function to extract user from JWT token
const getUser = (token) => {
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Start Apollo Server
await server.start();

// Middleware
const allowedOrigins = [
  process.env.BILLING_URL,
  process.env.INVENTORY_URL,
  process.env.BACKEND_URL,
  'https://studio.apollographql.com' // Allow Apollo Studio
].filter(Boolean);

console.log('🔒 CORS allowed origins:', allowedOrigins);

// Normalize URLs by removing trailing slashes for comparison
const normalizeUrl = (url) => url?.replace(/\/$/, '');
const normalizedAllowedOrigins = allowedOrigins.map(normalizeUrl);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    const normalizedOrigin = normalizeUrl(origin);

    // Allow configured origins (with normalized comparison)
    if (normalizedAllowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    // In development, allow all localhost origins
    if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
      return callback(null, true);
    }

    // Log rejected origins to help debug
    console.warn('❌ CORS rejected origin:', origin);
    console.warn('   Allowed origins:', normalizedAllowedOrigins.join(', '));

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GraphQL endpoint
app.use(
  '/graphql',
  expressMiddleware(server, {
    context: async ({ req }) => {
      const token = req.headers.authorization?.replace('Bearer ', '') || '';
      const user = getUser(token);
      return { user };
    },
  })
);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 GraphQL API: http://localhost:${PORT}/graphql`);
});
