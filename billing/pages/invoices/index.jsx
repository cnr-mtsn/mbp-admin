import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { GET_INVOICES } from '../../lib/graphql/queries';
import { extractUuid } from '../../lib/utils/gid';
import { formatDate, formatMoney } from '../../lib/utils/helpers';
import styles from '../../styles/pages.module.css';
import cardStyles from '../../styles/cardItems.module.css';

const statusStyles = {
  paid: styles.statusPaid,
  sent: styles.statusSent,
  overdue: styles.statusOverdue,
  draft: styles.statusDraft,
};

export default function Invoices() {
  const router = useRouter();
  const { data, loading, error } = useQuery(GET_INVOICES);
  const [statusFilter, setStatusFilter] = useState('all');

  if (loading) {
    return (
      <div className={styles.centerState}>
        <div className={styles.stateContent}>
          <h1 className={styles.stateTitle}>Loading invoices...</h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.centerState}>
        <div className={styles.stateContent}>
          <h1 className={styles.stateTitleError}>Error loading invoices</h1>
          <p className={styles.stateMessage}>{error.message}</p>
        </div>
      </div>
    );
  }

  const invoices = data?.invoices || [];

  // Filter invoices based on status
  const filteredInvoices = statusFilter === 'all'
    ? invoices
    : invoices.filter(invoice => invoice.status === statusFilter);

  // Calculate total unpaid balance
  const unpaidBalance = invoices
    .filter(invoice => invoice.status === 'sent')
    .reduce((sum, invoice) => sum + (parseFloat(invoice.total) || 0), 0);

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderContent}>
          <p className={styles.pageLabel}>Billing</p>
          <h2 className={styles.pageTitle}>Invoices</h2>
        </div>
        <Link href="/" className="btn-secondary">Back to Dashboard</Link>
      </div>

      {/* Total Unpaid Balance */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Total Unpaid Balance
          </p>
          <p style={{ fontSize: '2rem', fontWeight: '600', color: 'var(--status-overdue-text)' }}>
            {formatMoney(unpaidBalance)}
          </p>
        </div>
      </div>

      {/* Status Filters */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setStatusFilter('all')}
          className={statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}
        >
          All ({invoices.length})
        </button>
        {/* <button
          onClick={() => setStatusFilter('unpaid')}
          className={statusFilter === 'unpaid' ? 'btn-primary' : 'btn-secondary'}
        >
          Unpaid ({invoices.filter(i => i.status === 'unpaid').length})
        </button> */}
        <button
          onClick={() => setStatusFilter('paid')}
          className={statusFilter === 'paid' ? 'btn-primary' : 'btn-secondary'}
        >
          Paid ({invoices.filter(i => i.status === 'paid').length})
        </button>
        <button
          onClick={() => setStatusFilter('sent')}
          className={statusFilter === 'sent' ? 'btn-primary' : 'btn-secondary'}
        >
          Sent ({invoices.filter(i => i.status === 'sent').length})
        </button>
        <button
          onClick={() => setStatusFilter('draft')}
          className={statusFilter === 'draft' ? 'btn-primary' : 'btn-secondary'}
        >
          Draft ({invoices.filter(i => i.status === 'draft').length})
        </button>
      </div>

      <div className={styles.cardGrid}>
        {filteredInvoices.map((invoice) => {
          const statusClass = statusStyles[invoice.status] || statusStyles.draft;
          return (
            <Link href={`/invoices/${extractUuid(invoice.id)}`} key={invoice.id}>
              <div className="card">
                <div className={cardStyles.itemHeader}>
                  <div className={cardStyles.itemHeaderContent}>
                    <p className={cardStyles.itemLabel}>Invoice</p>
                    <h3 className={cardStyles.itemTitle}>{invoice.title}</h3>
                    <p className={cardStyles.itemDescription}>{invoice.customer?.name || 'No customer'}</p>
                  </div>
                  <span className={`pill ${statusClass}`}>{invoice.status}</span>
                </div>

                <div className={cardStyles.itemTags}>
                  <span className={cardStyles.itemTag}>
                    {invoice.payment_stage || 'Payment stage'}
                  </span>
                  {invoice.percentage && (
                    <span className={cardStyles.itemTag}>
                      {invoice.percentage}%
                    </span>
                  )}
                  {invoice.job?.title && (
                    <span className={cardStyles.itemTag}>
                      {invoice.job.title}
                    </span>
                  )}
                </div>

                <div className={cardStyles.itemFooter}>
                  <div>
                    <p className={`${cardStyles.itemTitle} price`}>{formatMoney(invoice.total || 0)}</p>
                    <p className={cardStyles.itemDescription}>
                      {invoice.due_date ? `Due ${formatDate(invoice.due_date)}` : 'No due date'}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {filteredInvoices.length === 0 && (
        <div className={`card ${styles.emptyState}`}>
          <p className="muted">
            {statusFilter === 'all'
              ? 'No invoices found'
              : `No ${statusFilter} invoices found`}
          </p>
        </div>
      )}
    </div>
  );
}
