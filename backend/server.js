import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import jwt from 'jsonwebtoken';
import { typeDefs } from './graphql/schema/typeDefs.js';
import { resolvers } from './graphql/resolvers/index.js';
import { initializeCronJobs } from './services/cronService.js';
import cache from './utils/cacheManager.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Helper to normalize URLs by removing trailing slashes
const normalizeUrl = (url) => url?.replace(/\/$/, '');

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
    // Add artificial delay in development to see loading states
    // Disabled to allow caching performance to be visible
    // {
    //   async requestDidStart() {
    //     return {
    //       async willSendResponse() {
    //         if (process.env.NODE_ENV === 'development') {
    //           await new Promise(resolve => setTimeout(resolve, 800));
    //         }
    //       },
    //     };
    //   },
    // },
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
  process.env.RENDER_URL, // Render's default URL for internal requests
  'https://studio.apollographql.com' // Allow Apollo Studio
].filter(Boolean);

console.log('🔒 CORS allowed origins:', allowedOrigins);

const normalizedAllowedOrigins = allowedOrigins.map(normalizeUrl);
const billingOrigin = normalizeUrl(process.env.BILLING_URL);

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

    // Allow all Render.com URLs (for internal Render requests and health checks)
    if (origin.endsWith('.onrender.com')) {
      return callback(null, true);
    }

    // Allow all ngrok URLs in development
    if (process.env.NODE_ENV !== 'production' && origin.includes('ngrok-free.app')) {
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

// Cache statistics endpoint (development only)
if (process.env.NODE_ENV === 'development') {
  app.get('/cache/stats', (req, res) => {
    const stats = cache.getStats();
    res.json(stats);
  });

  app.post('/cache/clear', (req, res) => {
    cache.clear();
    res.json({ success: true, message: 'Cache cleared successfully' });
  });

  console.log('🔧 Cache management endpoints enabled:');
  console.log('   GET  /cache/stats - View cache statistics');
  console.log('   POST /cache/clear - Clear all cache');
}

// GraphQL endpoint
app.use(
  '/graphql',
  expressMiddleware(server, {
    context: async ({ req }) => {
      const token = req.headers.authorization?.replace('Bearer ', '') || '';
      const origin = normalizeUrl(req.headers.origin || req.headers.referer);
      const isBillingRequest = billingOrigin && origin === billingOrigin;
      const user = getUser(token);
      const userForContext = isBillingRequest && user && user.role !== 'admin' && user.role !== 'superadmin' ? null : user;

      return { user: userForContext, isBillingRequest };
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

  // Initialize cron jobs after server starts
  initializeCronJobs();
});
