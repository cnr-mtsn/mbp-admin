import { query } from '../../config/database.js';
import { toGidFormatArray } from '../../utils/resolverHelpers.js';

const requireAuth = (user) => {
  if (!user) {
    throw new Error('Not authenticated');
  }
};

export const dashboardResolvers = {
  Query: {
    dashboardAnalytics: async (_, __, { user }) => {
      requireAuth(user);

      // Get invoice statistics
      const invoiceStats = await query(`
        SELECT
          COUNT(*) FILTER (WHERE status IN ('sent', 'unpaid', 'overdue')) as open_invoices_count,
          COUNT(*) FILTER (WHERE status = 'paid') as paid_invoices_count,
          COUNT(*) FILTER (WHERE status IN ('sent', 'unpaid', 'overdue') AND due_date < NOW()) as overdue_invoices_count,
          SUM(total) FILTER (WHERE status = 'paid' AND EXTRACT(YEAR FROM paid_date) = EXTRACT(YEAR FROM NOW())) as total_revenue,
          SUM(total) FILTER (WHERE status IN ('sent', 'unpaid', 'overdue')) as outstanding_balance,
          SUM(total) FILTER (WHERE status IN ('sent', 'unpaid', 'overdue') AND due_date < NOW()) as overdue_balance
        FROM invoices
      `);

      // Get job statistics
      const jobStats = await query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_jobs_count,
          COUNT(*) FILTER (WHERE status = 'pending') as pending_jobs_count,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs_count
        FROM jobs
      `);

      // Get recent in-progress jobs (last 5)
      const recentJobsResult = await query(`
        SELECT j.*,
               (SELECT COUNT(*) FROM invoices WHERE job_id = j.id) as invoice_count,
               (SELECT COUNT(*) FROM invoices WHERE job_id = j.id AND status = 'paid') as paid_count,
               (SELECT SUM(total) FROM invoices WHERE job_id = j.id AND status = 'paid') as amount_paid
        FROM jobs j
        WHERE status IN ('in_progress', 'pending')
        ORDER BY
          CASE status
            WHEN 'in_progress' THEN 1
            WHEN 'pending' THEN 2
          END,
          created_at DESC
        LIMIT 5
      `);

      // Get overdue invoices
      const overdueInvoicesResult = await query(`
        SELECT * FROM invoices
        WHERE status IN ('sent', 'unpaid', 'overdue')
        AND due_date < NOW()
        ORDER BY due_date ASC
        LIMIT 10
      `);

      // Get recent payments (last 5)
      const recentPaymentsResult = await query(`
        SELECT * FROM invoices
        WHERE status = 'paid'
        ORDER BY paid_date DESC NULLS LAST, updated_at DESC
        LIMIT 5
      `);

      const stats = invoiceStats.rows[0];
      const jobs = jobStats.rows[0];

      return {
        total_revenue: parseFloat(stats.total_revenue) || 0,
        outstanding_balance: parseFloat(stats.outstanding_balance) || 0,
        overdue_balance: parseFloat(stats.overdue_balance) || 0,
        in_progress_jobs_count: parseInt(jobs.in_progress_jobs_count) || 0,
        pending_jobs_count: parseInt(jobs.pending_jobs_count) || 0,
        completed_jobs_count: parseInt(jobs.completed_jobs_count) || 0,
        open_invoices_count: parseInt(stats.open_invoices_count) || 0,
        overdue_invoices_count: parseInt(stats.overdue_invoices_count) || 0,
        paid_invoices_count: parseInt(stats.paid_invoices_count) || 0,
        recent_jobs: toGidFormatArray(recentJobsResult.rows, 'Job', { foreignKeys: ['customer_id', 'estimate_id'] }),
        overdue_invoices: toGidFormatArray(overdueInvoicesResult.rows, 'Invoice', { foreignKeys: ['customer_id', 'job_id', 'estimate_id'] }).map(row => ({
          ...row,
          line_items: typeof row.line_items === 'string' ? JSON.parse(row.line_items) : row.line_items
        })),
        recent_payments: toGidFormatArray(recentPaymentsResult.rows, 'Invoice', { foreignKeys: ['customer_id', 'job_id', 'estimate_id'] }).map(row => ({
          ...row,
          line_items: typeof row.line_items === 'string' ? JSON.parse(row.line_items) : row.line_items
        })),
      };
    },
  },
};
