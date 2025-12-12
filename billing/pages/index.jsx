import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { GET_DASHBOARD_ANALYTICS } from '../lib/graphql/queries';
import { formatMoney, formatDate, formatStatus } from '../lib/utils/helpers';
import { extractUuid } from '../lib/utils/gid';
import { useAuthStore } from '../store/authStore';
import styles from '../styles/pages.module.css';
import cardStyles from '../styles/cardItems.module.css';
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {user?.role === 'superadmin' && (
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <Icon name="dollar-sign" size={5} />
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{currentYear} Revenue</p>
            </div>
            <p style={{ fontSize: '1.875rem', fontWeight: '600', color: 'var(--text-primary)' }}>
              {formatMoney(analytics.total_revenue)}
            </p>
          </div>
        )}

        <Link
          href="/invoices?status=sent,overdue"
          className="card"
          style={{ padding: '1.5rem', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <Icon name="clock" size={5} />
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Outstanding</p>
          </div>
          <p style={{ fontSize: '1.875rem', fontWeight: '600', color: 'var(--status-sent-text)' }}>
            {formatMoney(analytics.outstanding_balance)}
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {analytics.open_invoices_count} open invoice{analytics.open_invoices_count !== 1 ? 's' : ''}
          </p>
        </Link>

        <Link
          href="/invoices?status=overdue"
          className="card"
          style={{ padding: '1.5rem', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <Icon name="alert-circle" size={5} />
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Overdue</p>
          </div>
          <p style={{ fontSize: '1.875rem', fontWeight: '600', color: 'var(--status-overdue-text)' }}>
            {formatMoney(analytics.overdue_balance)}
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {analytics.overdue_invoices_count} overdue invoice{analytics.overdue_invoices_count !== 1 ? 's' : ''}
          </p>
        </Link>

        <Link
          href="/jobs?status=in_progress"
          className="card"
          style={{ padding: '1.5rem', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <Icon name="briefcase" size={5} />
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Active Jobs</p>
          </div>
          <p style={{ fontSize: '1.875rem', fontWeight: '600', color: 'var(--text-primary)' }}>
            {analytics.in_progress_jobs_count}
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {analytics.pending_jobs_count} pending
          </p>
        </Link>
      </div>

      {/* Recent Activity Sections */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>

        {/* Recent Jobs */}
        {analytics.recent_jobs.length > 0 && (
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Active Jobs</h3>
              <Link href="/jobs" style={{ fontSize: '0.875rem', color: 'var(--primary)' }}>
                View all →
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {analytics.recent_jobs.map(job => (
                <Link
                  key={job.id}
                  href={`/jobs/${extractUuid(job.id)}`}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border-color)',
                    display: 'block',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--card-hover-bg)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.25rem' }}>
                    <p style={{ fontWeight: '500', fontSize: '0.875rem' }}>{job.title}</p>
                    <span className={`pill-${job.status}`} style={{ fontSize: '0.75rem' }}>
                      {formatStatus(job.status)}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{job.customer.name}</p>
                  {job.total_amount && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
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
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'var(--status-overdue-text)' }}>
                Overdue Invoices
              </h3>
              <Link href="/invoices" style={{ fontSize: '0.875rem', color: 'var(--primary)' }}>
                View all →
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {analytics.overdue_invoices.map(invoice => (
                <Link
                  key={invoice.id}
                  href={`/invoices/${extractUuid(invoice.id)}`}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--status-overdue-border)',
                    backgroundColor: 'var(--status-overdue-bg)',
                    display: 'block',
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.25rem' }}>
                    <p style={{ fontWeight: '500', fontSize: '0.875rem' }}>{invoice.title}</p>
                    <p style={{ fontWeight: '600', fontSize: '0.875rem', color: 'var(--status-overdue-text)' }}>
                      {formatMoney(invoice.total)}
                    </p>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{invoice.customer.name}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--status-overdue-text)', marginTop: '0.25rem' }}>
                    Due {formatDate(invoice.due_date)}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recent Payments */}
        {analytics.recent_payments.length > 0 && (
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Recent Payments</h3>
              <Link href="/invoices" style={{ fontSize: '0.875rem', color: 'var(--primary)' }}>
                View all →
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {analytics.recent_payments.map(payment => (
                <Link
                  key={payment.id}
                  href={`/invoices/${extractUuid(payment.id)}`}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border-color)',
                    display: 'block',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--card-hover-bg)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.25rem' }}>
                    <p style={{ fontWeight: '500', fontSize: '0.875rem' }}>{payment.title}</p>
                    <p style={{ fontWeight: '600', fontSize: '0.875rem', color: 'var(--status-paid-text)' }}>
                      {formatMoney(payment.total)}
                    </p>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{payment.customer.name}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
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
