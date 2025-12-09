import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { GET_INVOICES } from '../../lib/graphql/queries';
import { extractUuid } from '../../lib/utils/gid';
import { formatDate, formatMoney } from '../../lib/utils/helpers';
import styles from '../../styles/pages.module.css';
import cardStyles from '../../styles/cardItems.module.css';
import InvoicesGrid from '../../components/invoice/InvoicesGrid'
import BackButton from '../../components/ui/BackButton'

const statusStyles = {
  paid: styles.statusPaid,
  sent: styles.statusSent,
  overdue: styles.statusOverdue,
  draft: styles.statusDraft,
};

export default function Invoices() {
  const router = useRouter();
  const [itemsToShow, setItemsToShow] = useState(10);

  const { data, loading, error, fetchMore } = useQuery(GET_INVOICES, {
    variables: {
      first: itemsToShow,
    },
    notifyOnNetworkStatusChange: false,
  });

  const invoices = data?.invoices || [];

  const handleLoadMore = () => {
    const scrollPosition = window.scrollY;
    const newItemsToShow = itemsToShow + 10;
    setItemsToShow(newItemsToShow);
    fetchMore({
      variables: {
        first: newItemsToShow,
      },
    }).then(() => {
      // Restore scroll position after data is loaded
      window.scrollTo(0, scrollPosition);
    });
  };

  if (loading && invoices.length === 0) {
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

  // Calculate total unpaid balance
  const unpaidBalance = invoices
    .filter(invoice => invoice.status === 'sent')
    .reduce((sum, invoice) => sum + (parseFloat(invoice.total) || 0), 0);

  // Determine if there are more items to load
  const hasMore = invoices.length === itemsToShow;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderContent}>
          <p className={styles.pageLabel}>Billing</p>
          <h2 className={styles.pageTitle}>Invoices</h2>
        </div>
        <BackButton href="/" classes="btn-secondary" title="Back to Dashboard" />
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

      <InvoicesGrid
        invoices={invoices}
        onLoadMore={handleLoadMore}
        hasMore={hasMore}
        loading={loading}
      />
    </div>
  );
}
