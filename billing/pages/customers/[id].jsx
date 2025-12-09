import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client';
import { useState } from 'react';
import { GET_CUSTOMER } from '../../lib/graphql/queries';
import { toGid } from '../../lib/utils/gid';
import { formatDate, formatMoney } from '../../lib/utils/helpers';
import styles from '../../styles/pages.module.css';
import cardStyles from '../../styles/cardItems.module.css';
import InvoicesGrid from '../../components/invoice/InvoicesGrid'
import JobsGrid from '../../components/jobs/JobsGrid'
import BackButton from '../../components/ui/BackButton'
import Loading from '../../components/ui/Loading'

export default function CustomerDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [jobsToShow, setJobsToShow] = useState(10);
  const [invoicesToShow, setInvoicesToShow] = useState(10);

  const { data, loading, error, fetchMore } = useQuery(GET_CUSTOMER, {
    variables: {
      id: id ? toGid('Customer', id) : null,
      jobsFirst: jobsToShow,
      invoicesFirst: invoicesToShow,
    },
    skip: !id,
    notifyOnNetworkStatusChange: false,
  });

  if (loading) {
    return (
      <div className={styles.centerState}>
        <div className={styles.stateContent}>
          <Loading />
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
  const allInvoices = customer?.invoices || [];
  const customerInvoices = allInvoices.filter(invoice => invoice.customer_id === customerId);

  // Get customer jobs
  const customerJobs = customer?.jobs || [];

  // Calculate total unpaid balance for this customer
  const unpaidBalance = customerInvoices
    .filter(invoice => invoice.status === 'sent')
    .reduce((sum, invoice) => sum + (parseFloat(invoice.total) || 0), 0);

  // Handle load more for jobs
  const handleLoadMoreJobs = () => {
    const scrollPosition = window.scrollY;
    const newJobsToShow = jobsToShow + 10;
    setJobsToShow(newJobsToShow);
    fetchMore({
      variables: {
        jobsFirst: newJobsToShow,
        invoicesFirst: invoicesToShow,
      },
    }).then(() => {
      // Restore scroll position after data is loaded
      window.scrollTo(0, scrollPosition);
    });
  };

  // Handle load more for invoices
  const handleLoadMoreInvoices = () => {
    const scrollPosition = window.scrollY;
    const newInvoicesToShow = invoicesToShow + 10;
    setInvoicesToShow(newInvoicesToShow);
    fetchMore({
      variables: {
        jobsFirst: jobsToShow,
        invoicesFirst: newInvoicesToShow,
      },
    }).then(() => {
      // Restore scroll position after data is loaded
      window.scrollTo(0, scrollPosition);
    });
  };

  // Determine if there are more items to load
  const hasMoreJobs = customerJobs.length === jobsToShow;
  const hasMoreInvoices = customerInvoices.length === invoicesToShow;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeaderLarge}>
        <div className={styles.pageHeaderContent}>
          <p className={styles.pageLabel}>Customer</p>
          <h2 className={styles.pageTitle}>{customer.name}</h2>
        </div>
        <BackButton href="/customers" classes="btn-secondary" title="Back to all customers" />
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

      {/* Jobs Section */}
      <div style={{ marginTop: '3rem' }}>
        <h3 className={cardStyles.detailSectionTitle} style={{ marginBottom: '1.5rem' }}>
          Jobs
        </h3>

        {!loading && customerJobs.length > 0 && (
          <JobsGrid
            jobs={customerJobs}
            showFilters={true}
            showSort={true}
            onLoadMore={handleLoadMoreJobs}
            hasMore={hasMoreJobs}
            loading={loading}
          />
        )}

        {loading && <Loading />}

        {!loading && customerJobs.length === 0 && (
          <div className={`card ${styles.emptyState}`}>
            <p className="muted">No jobs for this customer yet.</p>
          </div>
        )}
      </div>

      {/* Invoices Section */}
      <div style={{ marginTop: '3rem' }}>
        <h3 className={cardStyles.detailSectionTitle} style={{ marginBottom: '1.5rem' }}>
          Invoices
        </h3>

        {!loading && customerInvoices.length > 0 && (
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

            <InvoicesGrid
              invoices={customerInvoices}
              onLoadMore={handleLoadMoreInvoices}
              hasMore={hasMoreInvoices}
              loading={loading}
            />
          </>
        )}

        {loading && <Loading />}

        {!loading && customerInvoices.length === 0 && (
          <div className={`card ${styles.emptyState}`}>
            <p className="muted">No invoices for this customer yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
