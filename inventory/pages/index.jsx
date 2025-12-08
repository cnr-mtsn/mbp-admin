import { useState, useEffect } from 'react';
import Link from 'next/link';
import { analyticsAPI } from '../api/client';
import { capitalize } from '../utils/helpers'
import useAuthStore from '../store/authStore'
import styles from '../styles/dashboard.module.css'
import TransactionList from '../components/transactions/TransactionList';

function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { user } = useAuthStore()

  useEffect(() => {
    if(user) loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await analyticsAPI.getDashboard();
      setData(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div>Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <div className={styles.errorText}>{error}</div>
        <button
          onClick={loadDashboard}
          className={styles.errorButton}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.header}>Dashboard</h1>

      {/* Summary Cards */}
      <div className={styles.summaryGrid}>
        <Link
          href="/inventory"
          className={styles.summaryCardLink}
          aria-label="View all inventory"
        >
          <div className={styles.summaryCard}>
            <div className={styles.summaryCardContent}>
              <div className={styles.summaryCardInner}>
                <div className={styles.summaryIcon}>
                  <div className={`${styles.iconWrapper} ${styles.iconPrimary}`}>
                    <svg className={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                </div>
                <div className={styles.summaryContent}>
                  <dl>
                    <dt className={styles.summaryLabel}>
                      Total Products
                    </dt>
                    <dd className={styles.summaryValue}>
                      {data?.summary?.total_products || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </Link>

        <Link
          href="/inventory?view=available"
          className={styles.summaryCardLink}
          aria-label="View available inventory"
        >
          <div className={styles.summaryCard}>
            <div className={styles.summaryCardContent}>
              <div className={styles.summaryCardInner}>
                <div className={styles.summaryIcon}>
                  <div className={`${styles.iconWrapper} ${styles.iconSuccess}`}>
                    <svg className={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className={styles.summaryContent}>
                  <dl>
                    <dt className={styles.summaryLabel}>
                      Available
                    </dt>
                    <dd className={styles.summaryValue}>
                      {data?.summary?.available_products || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </Link>

        <Link
          href="/inventory?view=low-stock"
          className={styles.summaryCardLink}
          aria-label="View low stock inventory"
        >
          <div className={styles.summaryCard}>
            <div className={styles.summaryCardContent}>
              <div className={styles.summaryCardInner}>
                <div className={styles.summaryIcon}>
                  <div className={`${styles.iconWrapper} ${styles.iconWarning}`}>
                    <svg className={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>
                <div className={styles.summaryContent}>
                  <dl>
                    <dt className={styles.summaryLabel}>
                      Low Stock
                    </dt>
                    <dd className={styles.summaryValue}>
                      {data?.summary?.low_stock_items || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </Link>

        <Link
          href="/transactions"
          className={styles.summaryCardLink}
          aria-label="View today's transactions"
        >
          <div className={styles.summaryCard}>
            <div className={styles.summaryCardContent}>
              <div className={styles.summaryCardInner}>
                <div className={styles.summaryIcon}>
                  <div className={`${styles.iconWrapper} ${styles.iconPrimary}`}>
                    <svg className={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
                <div className={styles.summaryContent}>
                  <dl>
                    <dt className={styles.summaryLabel}>
                      Today's Transactions
                    </dt>
                    <dd className={styles.summaryValue}>
                      {data?.summary?.transactions_today || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Transactions */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>
            Recent Transactions
          </h3>
        </div>
        <div className={styles.sectionDivider}>
          {data?.recent_transactions && data.recent_transactions.length > 0 ? (
            <TransactionList transactions={data.recent_transactions} />
          ) : (
            <div className={styles.emptyState}>
              No recent transactions
            </div>
          )}
        </div>
      </div>

      {/* Inventory by Type */}
      <div className={styles.inventoryGrid}>
        <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>
            Inventory by Type
          </h3>
        </div>
        <div className={styles.sectionDivider}>
          {data?.inventory_by_type && data.inventory_by_type.length > 0 ? (
            <div className={styles.summaryList}>
              {data.inventory_by_type.map((item, index) => (
                <div key={index} className={styles.summaryItem}>
                  <div className={styles.summaryItemHeader}>
                    <span className={styles.summaryItemValue}>{item.product_type}</span>
                  </div>
                  <div className={styles.summaryMetrics}>
                    <div className={styles.summaryMetric}>
                      <span className={styles.metricLabel}>Total</span>
                      <span className={styles.metricValue}>{item.count}</span>
                    </div>
                    <div className={styles.summaryMetric}>
                      <span className={styles.metricLabel}>Available</span>
                      <span className={styles.metricValue}>{item.available_count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              No inventory data
            </div>
          )}
          </div>
        </div>

        <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>
            Paint/Stain by Category
          </h3>
        </div>
        <div className={styles.sectionDivider}>
          {data?.inventory_by_category && data.inventory_by_category.length > 0 ? (
            <div className={styles.summaryList}>
              {data.inventory_by_category.map((item, index) => (
                <div key={index} className={styles.summaryItem}>
                  <div className={styles.summaryItemHeader}>
                    <span className={styles.summaryItemValue}>{item.category}</span>
                  </div>
                  <div className={styles.summaryMetrics}>
                    <div className={styles.summaryMetric}>
                      <span className={styles.metricLabel}>Count</span>
                      <span className={styles.metricValue}>{item.count}</span>
                    </div>
                    <div className={styles.summaryMetric}>
                      <span className={styles.metricLabel}>Total (gal)</span>
                      <span className={styles.metricValue}>
                        {parseFloat(item.total_gallons || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              No paint/stain inventory
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
