import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { GET_CUSTOMER, GET_INVOICES } from '../../lib/graphql/queries';
import { toGid, extractUuid } from '../../lib/utils/gid';
import { formatDate, formatMoney } from '../../lib/utils/helpers';
import styles from '../../styles/pages.module.css';
import cardStyles from '../../styles/cardItems.module.css';

const statusStyles = {
  paid: styles.statusPaid,
  sent: styles.statusSent,
  overdue: styles.statusOverdue,
  draft: styles.statusDraft,
};

export default function CustomerDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [statusFilter, setStatusFilter] = useState('all');

  const { data, loading, error } = useQuery(GET_CUSTOMER, {
    variables: { id: id ? toGid('Customer', id) : null },
    skip: !id,
  });

  const { data: invoicesData, loading: invoicesLoading } = useQuery(GET_INVOICES);

  if (loading) {
    return (
      <div className={styles.centerState}>
        <div className={styles.stateContent}>
          <h1 className={styles.stateTitle}>Loading customer...</h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.centerState}>
        <div className={styles.stateContent}>
          <h1 className={styles.stateTitleError}>Error loading customer</h1>
          <p className={styles.stateMessage}>{error.message}</p>
        </div>
      </div>
    );
  }

  const customer = data?.customer;

  if (!customer) {
    return (
      <div className={styles.centerState}>
        <div className={styles.stateContent}>
          <h1 className={styles.stateTitle}>Customer not found</h1>
        </div>
      </div>
    );
  }

  // Filter invoices for this customer
  const customerId = toGid('Customer', id);
  const allInvoices = invoicesData?.invoices || [];
  const customerInvoices = allInvoices.filter(invoice => invoice.customer_id === customerId);

  // Apply status filter
  const filteredInvoices = statusFilter === 'all'
    ? customerInvoices
    : customerInvoices.filter(invoice => invoice.status === statusFilter);

  // Calculate total unpaid balance for this customer
  const unpaidBalance = customerInvoices
    .filter(invoice => invoice.status === 'sent')
    .reduce((sum, invoice) => sum + (parseFloat(invoice.total) || 0), 0);

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeaderLarge}>
        <div className={styles.pageHeaderContent}>
          <p className={styles.pageLabel}>Customer</p>
          <h2 className={styles.pageTitle}>{customer.name}</h2>
        </div>
        <Link href="/customers" className="btn-secondary">
          Back to Customers
        </Link>
      </div>

      <div className={`card ${cardStyles.detailSection}`}>
        <h3 className={cardStyles.detailSectionTitle}>Contact Information</h3>
        <dl className={styles.detailGrid}>
          <div className={cardStyles.detailItem}>
            <dt className={cardStyles.detailLabel}>Name</dt>
            <dd className={cardStyles.detailValue}>{customer.name}</dd>
          </div>
          <div className={cardStyles.detailItem}>
            <dt className={cardStyles.detailLabel}>Email</dt>
            <dd className={cardStyles.detailLink}>
              <a href={`mailto:${customer.email}`}>
                {customer.email}
              </a>
            </dd>
          </div>
          <div className={cardStyles.detailItem}>
            <dt className={cardStyles.detailLabel}>Phone</dt>
            <dd className={cardStyles.detailLink}>
              <a href={`tel:${customer.phone}`}>
                {customer.phone}
              </a>
            </dd>
          </div>
          <div className={cardStyles.detailItem}>
            <dt className={cardStyles.detailLabel}>Address</dt>
            <dd className={cardStyles.detailValue}>
              {customer.address && (
                <>
                  {customer.address}
                  <br />
                  {customer.city}, {customer.state} {customer.zip}
                </>
              )}
              {!customer.address && '-'}
            </dd>
          </div>
          <div className={cardStyles.detailItem}>
            <dt className={cardStyles.detailLabel}>Created</dt>
            <dd className={cardStyles.detailValue}>
              {formatDate(customer.created_at)}
            </dd>
          </div>
          {customer.updated_at && (
            <div className={cardStyles.detailItem}>
              <dt className={cardStyles.detailLabel}>Last Updated</dt>
              <dd className={cardStyles.detailValue}>
                {formatDate(customer.updated_at)}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Invoices Section */}
      <div style={{ marginTop: '3rem' }}>
        <h3 className={cardStyles.detailSectionTitle} style={{ marginBottom: '1.5rem' }}>
          Invoices
        </h3>

        {!invoicesLoading && customerInvoices.length > 0 && (
          <>
            {/* Total Unpaid Balance */}
            {unpaidBalance > 0 && (
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    Unpaid Balance
                  </p>
                  <p style={{ fontSize: '2rem', fontWeight: '600', color: 'var(--status-overdue-text)' }}>
                    {formatMoney(unpaidBalance)}
                  </p>
                </div>
              </div>
            )}

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
                All ({customerInvoices.length})
              </button>
              <button
                onClick={() => setStatusFilter('paid')}
                className={statusFilter === 'paid' ? 'btn-primary' : 'btn-secondary'}
              >
                Paid ({customerInvoices.filter(i => i.status === 'paid').length})
              </button>
              <button
                onClick={() => setStatusFilter('sent')}
                className={statusFilter === 'sent' ? 'btn-primary' : 'btn-secondary'}
              >
                Sent ({customerInvoices.filter(i => i.status === 'sent').length})
              </button>
              <button
                onClick={() => setStatusFilter('draft')}
                className={statusFilter === 'draft' ? 'btn-primary' : 'btn-secondary'}
              >
                Draft ({customerInvoices.filter(i => i.status === 'draft').length})
              </button>
            </div>

            {/* Invoices Grid */}
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
                          <p className={cardStyles.itemDescription}>{invoice.description || 'No description'}</p>
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
                          <p className={cardStyles.itemTitle}>{formatMoney(invoice.total || 0)}</p>
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
          </>
        )}

        {invoicesLoading && (
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <p className="muted">Loading invoices...</p>
          </div>
        )}

        {!invoicesLoading && customerInvoices.length === 0 && (
          <div className={`card ${styles.emptyState}`}>
            <p className="muted">No invoices for this customer yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
