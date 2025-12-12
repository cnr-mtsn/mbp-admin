import { query } from '../../config/database.js';
import { toGidFormatArray } from '../../utils/resolverHelpers.js';
import { cachedResolver } from '../../utils/cachedResolver.js';

const requireAuth = (user) => {
  if (!user) {
    throw new Error('Not authenticated');
  }
};

export const analyticsResolvers = {
  Query: {
    inventorySummary: cachedResolver(
      async (_, __, { user }) => {
        requireAuth(user);

        // Get total products count (excluding soft-deleted)
        const totalProductsResult = await query(
          'SELECT COUNT(*) as count FROM products WHERE deleted_at IS NULL'
        );

        // Get available products count
        const availableProductsResult = await query(
          "SELECT COUNT(*) as count FROM products WHERE status = 'available' AND deleted_at IS NULL"
        );

        // Get depleted products count
        const depletedProductsResult = await query(
          "SELECT COUNT(*) as count FROM products WHERE status = 'depleted' AND deleted_at IS NULL"
        );

        // Get total gallons
        const totalGallonsResult = await query(
          'SELECT SUM(amount_gallons) as total FROM products WHERE deleted_at IS NULL'
        );

        // Get inventory by product type
        const productsByTypeResult = await query(`
          SELECT
            product_type,
            COUNT(*) as count,
            SUM(amount_gallons) as total_gallons
          FROM products
          WHERE deleted_at IS NULL
          GROUP BY product_type
          ORDER BY count DESC
        `);

        // Get inventory by status
        const productsByStatusResult = await query(`
          SELECT
            status,
            COUNT(*) as count
          FROM products
          WHERE deleted_at IS NULL
          GROUP BY status
          ORDER BY count DESC
        `);

        // Get low stock items (less than 0.5 gallons for paint/stain)
        const lowStockResult = await query(`
          SELECT p.*,
                 (SELECT COUNT(*) FROM transactions WHERE product_id = p.id) as transaction_count
          FROM products p
          WHERE (p.product_type = 'paint' OR p.product_type = 'stain')
            AND p.amount_gallons > 0
            AND p.amount_gallons < 0.5
            AND p.status = 'available'
            AND p.deleted_at IS NULL
          ORDER BY p.amount_gallons ASC
        `);

        const lowStockProducts = toGidFormatArray(lowStockResult.rows, 'Product').map(row => ({
          ...row,
          attributes: typeof row.attributes === 'string' ? JSON.parse(row.attributes) : row.attributes
        }));

        return {
          total_products: parseInt(totalProductsResult.rows[0].count),
          available_products: parseInt(availableProductsResult.rows[0].count),
          depleted_products: parseInt(depletedProductsResult.rows[0].count),
          total_gallons: parseFloat(totalGallonsResult.rows[0].total || 0),
          products_by_type: productsByTypeResult.rows.map(row => ({
            product_type: row.product_type,
            count: parseInt(row.count),
            total_gallons: parseFloat(row.total_gallons || 0)
          })),
          products_by_status: productsByStatusResult.rows.map(row => ({
            status: row.status,
            count: parseInt(row.count)
          })),
          low_stock_products: lowStockProducts
        };
      },
      {
        operationName: 'inventorySummary',
        getTags: () => ['inventory:analytics'],
        ttl: 120000, // 2 minutes (analytics data is more dynamic)
      }
    ),

    employeeActivity: cachedResolver(
      async (_, { start_date, end_date }, { user }) => {
        requireAuth(user);

        let queryText = `
          SELECT
            employee_name,
            transaction_type,
            COUNT(*) as transaction_count,
            SUM(amount_gallons) as total_gallons,
            MAX(created_at) as last_transaction
          FROM transactions
          WHERE 1=1
        `;

        const params = [];
        let paramCount = 1;

        if (start_date) {
          queryText += ` AND created_at >= $${paramCount}`;
          params.push(start_date);
          paramCount++;
        }

        if (end_date) {
          queryText += ` AND created_at <= $${paramCount}`;
          params.push(end_date);
          paramCount++;
        }

        queryText += `
          GROUP BY employee_name, transaction_type
          ORDER BY employee_name, transaction_type
        `;

        const result = await query(queryText, params);

        // Transform data for easier consumption
        const employeeData = {};

        result.rows.forEach(row => {
          if (!employeeData[row.employee_name]) {
            employeeData[row.employee_name] = {
              employee_name: row.employee_name,
              check_ins: 0,
              check_outs: 0,
              total_transactions: 0,
              total_gallons: 0,
              last_transaction: row.last_transaction
            };
          }

          const gallons = parseFloat(row.total_gallons || 0);

          if (row.transaction_type === 'check-in') {
            employeeData[row.employee_name].check_ins = parseInt(row.transaction_count);
          } else if (row.transaction_type === 'check-out') {
            employeeData[row.employee_name].check_outs = parseInt(row.transaction_count);
          }

          employeeData[row.employee_name].total_transactions += parseInt(row.transaction_count);
          employeeData[row.employee_name].total_gallons += gallons;

          // Update last transaction if this one is more recent
          if (new Date(row.last_transaction) > new Date(employeeData[row.employee_name].last_transaction)) {
            employeeData[row.employee_name].last_transaction = row.last_transaction;
          }
        });

        return Object.values(employeeData);
      },
      {
        operationName: 'employeeActivity',
        getTags: () => ['employee:analytics'],
        ttl: 120000, // 2 minutes
      }
    ),
  },
};
