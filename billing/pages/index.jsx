import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { GET_DASHBOARD_ANALYTICS } from '../lib/graphql/queries';
import { formatCustomerName, formatMoney, formatDate, formatStatus } from '../lib/utils/helpers';
import { extractUuid } from '../lib/utils/gid';
import { useAuthStore } from '../store/authStore';
import styles from '../styles/pages.module.css';
import cardStyles from '../styles/cardItems.module.css';
import dashboardStyles from './index.module.css';
import Loading from '../components/ui/Loading';
import Icon from '../components/ui/Icon';

export default function Dashboard() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const { data, loading, error } = useQuery(GET_DASHBOARD_ANALYTICS);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[90vh] mx-auto">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.centerState}>
        <div className={styles.stateContent}>
          <h1 className={styles.stateTitleError}>Error loading dashboard</h1>
          <p className={styles.stateMessage}>{error.message}</p>
        </div>
      </div>
    );
  }

  const analytics = data?.dashboardAnalytics;
  const currentYear = new Date().getFullYear();

  return (
    <div className={styles.pageContainer}>
      <h2 className={styles.pageTitle}>Dashboard</h2>

      {/* Key Metrics */}
      <div className={dashboardStyles.metricsGrid}>
        {user?.role === 'superadmin' && (
          <div className={`card ${dashboardStyles.metricCard}`}>
            <div className={dashboardStyles.metricHeader}>
              <Icon name="dollar-sign" size={5} />
              <p className={dashboardStyles.metricLabel}>{currentYear} Revenue</p>
            </div>
            <p className={dashboardStyles.metricValueRevenue}>
              {formatMoney(analytics.total_revenue)}
            </p>
          </div>
        )}

        <Link
          href="/invoices?status=sent,overdue"
          className={`card ${dashboardStyles.metricCard}`}
        >
          <div className={dashboardStyles.metricHeader}>
            <Icon name="clock" size={5} />
            <p className={dashboardStyles.metricLabel}>Outstanding</p>
          </div>
          <p className={dashboardStyles.metricValueOutstanding}>
            {formatMoney(analytics.outstanding_balance)}
          </p>
          <p className={dashboardStyles.metricSubtext}>
            {analytics.open_invoices_count} open invoice{analytics.open_invoices_count !== 1 ? 's' : ''}
          </p>
        </Link>

        <Link
          href="/invoices?status=overdue"
          className={`card ${dashboardStyles.metricCard}`}
        >
          <div className={dashboardStyles.metricHeader}>
            <Icon name="alert-circle" size={5} />
            <p className={dashboardStyles.metricLabel}>Overdue</p>
          </div>
          <p className={dashboardStyles.metricValueOverdue}>
            {formatMoney(analytics.overdue_balance)}
          </p>
          <p className={dashboardStyles.metricSubtext}>
            {analytics.overdue_invoices_count} overdue invoice{analytics.overdue_invoices_count !== 1 ? 's' : ''}
          </p>
        </Link>

        <Link
          href="/jobs?status=in_progress"
          className={`card ${dashboardStyles.metricCard}`}
        >
          <div className={dashboardStyles.metricHeader}>
            <Icon name="briefcase" size={5} />
            <p className={dashboardStyles.metricLabel}>Active Jobs</p>
          </div>
          <p className={dashboardStyles.metricValue}>
            {analytics.in_progress_jobs_count}
          </p>
          <p className={dashboardStyles.metricSubtext}>
            {analytics.pending_jobs_count} pending
          </p>
        </Link>
      </div>

      {/* Recent Activity Sections */}
      <div className={dashboardStyles.activityGrid}>

        {/* Recent Jobs */}
        {analytics.recent_jobs.length > 0 && (
          <div className={`card ${dashboardStyles.activityCard}`}>
            <div className={dashboardStyles.activityHeader}>
              <h3 className={dashboardStyles.activityTitle}>Active Jobs</h3>
              <Link href="/jobs?status=in_progress" className={dashboardStyles.viewAllLink}>
                View all →
              </Link>
            </div>
            <div className={dashboardStyles.itemList}>
              {analytics.recent_jobs.map(job => (
                <Link
                  key={job.id}
                  href={`/jobs/${extractUuid(job.id)}`}
                  className={dashboardStyles.jobItem}
                >
                  <div className={dashboardStyles.itemHeader}>
                    <p className={dashboardStyles.itemTitle}>{job.title}</p>
                    <span className={`pill-${job.status} ${dashboardStyles.itemStatus}`}>
                      {formatStatus(job.status)}
                    </span>
                  </div>
                  <p className={dashboardStyles.itemCustomer}>{formatCustomerName(job.customer)}</p>
                  {job.total_amount && (
                    <p className={dashboardStyles.itemAmount}>
                      {formatMoney(job.total_amount)}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Overdue Invoices */}
        {analytics.overdue_invoices.length > 0 && (
          <div className={`card ${dashboardStyles.activityCard}`}>
            <div className={dashboardStyles.activityHeader}>
              <h3 className={dashboardStyles.activityTitleOverdue}>
                Overdue Invoices
              </h3>
              <Link href="/invoices?status=overdue" className={dashboardStyles.viewAllLink}>
                View all →
              </Link>
            </div>
            <div className={dashboardStyles.itemList}>
              {analytics.overdue_invoices.map(invoice => (
                <Link
                  key={invoice.id}
                  href={`/invoices/${extractUuid(invoice.id)}`}
                  className={dashboardStyles.overdueItem}
                >
                  <div className={dashboardStyles.itemHeader}>
                    <p className={dashboardStyles.itemTitle}>{invoice.title}</p>
                    <p className={dashboardStyles.overdueAmount}>
                      {formatMoney(invoice.total)}
                    </p>
                  </div>
                  <p className={dashboardStyles.itemCustomer}>{formatCustomerName(invoice.customer)}</p>
                  <p className={dashboardStyles.overdueDueDate}>
                    Due {formatDate(invoice.due_date)}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recent Payments */}
        {analytics.recent_payments.length > 0 && (
          <div className={`card ${dashboardStyles.activityCard}`}>
            <div className={dashboardStyles.activityHeader}>
              <h3 className={dashboardStyles.activityTitle}>Recent Payments</h3>
              <Link href="/invoices" className={dashboardStyles.viewAllLink}>
                View all →
              </Link>
            </div>
            <div className={dashboardStyles.itemList}>
              {analytics.recent_payments.map(payment => (
                <Link
                  key={payment.id}
                  href={`/invoices/${extractUuid(payment.id)}`}
                  className={dashboardStyles.paymentItem}
                >
                  <div className={dashboardStyles.itemHeader}>
                    <p className={dashboardStyles.itemTitle}>{payment.title}</p>
                    <p className={dashboardStyles.paymentAmount}>
                      {formatMoney(payment.total)}
                    </p>
                  </div>
                  <p className={dashboardStyles.itemCustomer}>{formatCustomerName(payment.customer)}</p>
                  <p className={dashboardStyles.paymentDate}>
                    Paid {formatDate(payment.paid_date)}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
