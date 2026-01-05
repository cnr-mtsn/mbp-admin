import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';

// Custom fetch with timeout
const fetchWithTimeout = (uri, options) => {
  const timeout = 30000; // 30 seconds
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  return fetch(uri, {
    ...options,
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));
};

// GraphQL endpoint
const httpLink = createHttpLink({
  uri: process.env.NODE_ENV === 'production'
    ? process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_GRAPHQL_URL
    : 'http://localhost:4000/graphql',
  fetch: fetchWithTimeout,
});

// Auth link - inject JWT token
const authLink = setContext((_, { headers }) => {
  let token = null;

  // Only access localStorage on client side
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('token');
  }

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

// Error link - handle 401 and logout
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path, extensions }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      );

      // Handle authentication errors
      if (extensions?.code === 'UNAUTHENTICATED' || message.includes('Not authenticated')) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/account/login';
        }
      }
    });
  }

  if (networkError) {
    console.error(`[Network error]: ${networkError}`);

    // Handle 401 from network layer
    if (networkError.statusCode === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/account/login';
    }
  }
});

// Create Apollo Client
const client = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          jobs: {
            // Merge strategy for paginated queries
            keyArgs: ['filters', 'sortKey'],
            merge(existing = [], incoming, { args }) {
              // If offset is 0 or not provided, replace the cache (new query)
              // Note: args.offset can be undefined when not provided, so use !args?.offset
              if (!args?.offset) {
                return incoming;
              }
              // Otherwise, append new results (pagination)
              return [...existing, ...incoming];
            },
          },
          invoices: {
            keyArgs: ['filters', 'sortKey'],
            merge(existing = [], incoming, { args }) {
              if (!args?.offset) {
                return incoming;
              }
              return [...existing, ...incoming];
            },
          },
          customers: {
            keyArgs: ['sortKey'],
          },
          expenses: {
            keyArgs: ['filters', 'sortKey'],
            merge(existing = [], incoming, { args }) {
              if (!args?.offset) {
                return incoming;
              }
              return [...existing, ...incoming];
            },
          },
        },
      },
      Job: {
        keyFields: ['id'],
        fields: {
          invoices: {
            keyArgs: false,
          },
        },
      },
      Invoice: {
        keyFields: ['id'],
      },
      Customer: {
        keyFields: ['id'],
      },
      Expense: {
        keyFields: ['id'],
      },
      Payment: {
        keyFields: ['id'],
      },
      Estimate: {
        keyFields: ['id'],
      },
      User: {
        keyFields: ['id'],
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network', // Show cached data immediately, fetch in background
      errorPolicy: 'all',
    },
    query: {
      fetchPolicy: 'cache-first', // Use cache unless forced refetch
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});

export default client;
