import client from '../lib/apolloClient';
import {
  GET_CURRENT_USER,
  GET_ALL_PRODUCTS,
  GET_PRODUCT_BY_ID,
  GET_PRODUCT_BY_QR,
  GET_INVENTORY_SUMMARY,
  GET_TRANSACTIONS,
  GET_EMPLOYEE_ACTIVITY,
  GET_ALL_USERS,
  GET_USER_BY_ID,
} from '../graphql/queries';
import {
  LOGIN,
  REGISTER,
  FORGOT_PASSWORD,
  RESET_PASSWORD,
  CREATE_PRODUCT,
  UPDATE_PRODUCT,
  DELETE_PRODUCT,
  CREATE_TRANSACTION,
  UPDATE_USER,
  DELETE_USER,
} from '../graphql/mutations';

// ==================== AUTH API ====================

export const authAPI = {
  login: async (credentials) => {
    const { data } = await client.mutate({
      mutation: LOGIN,
      variables: credentials,
    });
    return { data: data.login };
  },

  register: async (userData) => {
    const { name, email, password } = userData;
    const { data } = await client.mutate({
      mutation: REGISTER,
      variables: { name, email, password },
    });
    return { data: data.register };
  },

  getCurrentUser: async () => {
    const { data } = await client.query({
      query: GET_CURRENT_USER,
      fetchPolicy: 'network-only',
    });
    return { data: data.me };
  },

  updateProfile: async (userData) => {
    // Note: This needs to be implemented on the backend
    // For now, throw an error
    throw new Error('Update profile not yet implemented in GraphQL');
  },

  forgotPassword: async (email) => {
    const { data } = await client.mutate({
      mutation: FORGOT_PASSWORD,
      variables: { email },
    });
    return { data: data.forgotPassword };
  },

  resetPassword: async ({ token, newPassword }) => {
    const { data } = await client.mutate({
      mutation: RESET_PASSWORD,
      variables: { token, newPassword },
    });
    return { data: data.resetPassword };
  },
};

// ==================== PRODUCTS API ====================

export const productsAPI = {
  getAll: async (search = '') => {
    const filters = search ? { search } : {};
    const { data } = await client.query({
      query: GET_ALL_PRODUCTS,
      variables: { filters, limit: 1000, offset: 0 },
      fetchPolicy: 'network-only',
    });
    return { data: data.products };
  },

  getById: async (id) => {
    const { data } = await client.query({
      query: GET_PRODUCT_BY_ID,
      variables: { id },
      fetchPolicy: 'network-only',
    });
    return { data: data.product };
  },

  checkIn: async (productData) => {
    // Check-in creates a new product
    const { data } = await client.mutate({
      mutation: CREATE_PRODUCT,
      variables: { input: productData },
    });

    // Return format matching REST API
    return {
      data: {
        product: data.createProduct,
        qrCode: `data:image/png;base64,${data.createProduct.id}`, // Placeholder
      },
    };
  },

  checkInExisting: async (id, checkInData) => {
    // Check-in existing product = create transaction
    const { employee_name, amount_gallons, notes } = checkInData;

    const { data } = await client.mutate({
      mutation: CREATE_TRANSACTION,
      variables: {
        input: {
          product_id: id,
          transaction_type: 'check-in',
          employee_name,
          amount_gallons: parseFloat(amount_gallons),
          notes,
        },
      },
    });

    return { data: data.createTransaction };
  },

  checkOut: async (id, checkOutData) => {
    // Check-out = create transaction
    const { employee_name, amount_gallons, notes } = checkOutData;

    const { data } = await client.mutate({
      mutation: CREATE_TRANSACTION,
      variables: {
        input: {
          product_id: id,
          transaction_type: 'check-out',
          employee_name,
          amount_gallons: parseFloat(amount_gallons),
          notes,
        },
      },
    });

    return { data: data.createTransaction };
  },

  delete: async (id) => {
    const { data } = await client.mutate({
      mutation: DELETE_PRODUCT,
      variables: { id },
    });
    return { data: data.deleteProduct };
  },

  getQRCode: async (id) => {
    // Generate QR code on the client side
    const QRCode = (await import('qrcode')).default;

    // Extract just the numeric ID if a URL or path is passed
    const numericId = typeof id === 'string' && id.includes('/')
      ? id.split('/').pop()
      : id;

    // Generate the product URL for the QR code
    const productUrl = `${window.location.origin}/product/${numericId}`;

    try {
      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(productUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      return {
        data: {
          qrCode: qrCodeDataUrl,
        },
      };
    } catch (err) {
      console.error('Failed to generate QR code:', err);
      return {
        data: {
          qrCode: null,
        },
      };
    }
  },

  getMyCheckedOut: async () => {
    // Get current user's checked-out products
    // This requires knowing the current user's name
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    const user = userStr ? JSON.parse(userStr) : null;

    if (!user) {
      return { data: [] };
    }

    const { data } = await client.query({
      query: GET_ALL_PRODUCTS,
      variables: {
        filters: { status: 'checked-out' },
        limit: 1000,
        offset: 0,
      },
      fetchPolicy: 'network-only',
    });

    // Filter by employee name from transactions
    // Note: This is a workaround. Ideally, backend should support this filter
    return { data: data.products };
  },

  getAllCheckedOut: async () => {
    const { data } = await client.query({
      query: GET_ALL_PRODUCTS,
      variables: {
        filters: { status: 'checked-out' },
        limit: 1000,
        offset: 0,
      },
      fetchPolicy: 'network-only',
    });
    return { data: data.products };
  },
};

// ==================== ANALYTICS API ====================

export const analyticsAPI = {
  getDashboard: async () => {
    const { data } = await client.query({
      query: GET_INVENTORY_SUMMARY,
      fetchPolicy: 'network-only',
    });

    // Transform to match REST API format
    return {
      data: {
        summary: {
          total_products: data.inventorySummary.total_products,
          available_products: data.inventorySummary.available_products,
          checked_out_products: 0, // Calculate from products_by_status
          low_stock_items: data.inventorySummary.low_stock_products.length,
          transactions_today: 0, // Would need separate query
        },
        recent_transactions: [], // Would need separate query
        inventory_by_type: data.inventorySummary.products_by_type,
        inventory_by_category: [], // Would need transformation
      },
    };
  },

  getLowStock: async () => {
    const { data } = await client.query({
      query: GET_INVENTORY_SUMMARY,
      fetchPolicy: 'network-only',
    });
    return { data: data.inventorySummary.low_stock_products };
  },

  getTransactions: async (filters) => {
    const { data } = await client.query({
      query: GET_TRANSACTIONS,
      variables: { filters, limit: 50, offset: 0 },
      fetchPolicy: 'network-only',
    });
    return { data: data.transactions };
  },

  getEmployeeActivity: async (filters) => {
    const { data } = await client.query({
      query: GET_EMPLOYEE_ACTIVITY,
      variables: filters,
      fetchPolicy: 'network-only',
    });
    return { data: data.employeeActivity };
  },
};

// ==================== ADMIN API ====================

export const adminAPI = {
  getAllUsers: async () => {
    const { data } = await client.query({
      query: GET_ALL_USERS,
      variables: { limit: 1000, offset: 0 },
      fetchPolicy: 'network-only',
    });

    return { data: data.users };
  },

  getUserById: async (id) => {
    const gid = `gid://matson-bros/User/${id}`;
    const { data } = await client.query({
      query: GET_USER_BY_ID,
      variables: { id },
      fetchPolicy: 'network-only',
    });

    return { data: data.user };
  },

  updateUser: async (id, userData) => {
    const { data } = await client.mutate({
      mutation: UPDATE_USER,
      variables: { id, input: userData },
    });

    return { data: data.updateUser };
  },

  deleteUser: async (id) => {
    const { data } = await client.mutate({
      mutation: DELETE_USER,
      variables: { id },
    });

    return { data: data.deleteUser };
  },
};
