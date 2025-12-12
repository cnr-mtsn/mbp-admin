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
import Loading from '../../components/ui/Loading'
import Icon from '../../components/ui/Icon'

const statusStyles = {
  paid: styles.statusPaid,
  sent: styles.statusSent,
  overdue: styles.statusOverdue,
  draft: styles.statusDraft,
};

export default function Invoices() {
  const router = useRouter();
  const [invoices, setInvoices] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);

  const INVOICES_PER_PAGE = 20

  // Get initial filter from query params
  const initialFilter = router.query.status || 'all';

  const { data, loading, error, fetchMore } = useQuery(GET_INVOICES, {
    variables: {
      first: INVOICES_PER_PAGE,
      offset: 0,
    },
    notifyOnNetworkStatusChange: false,
    onCompleted: (data) => {
      setInvoices(data?.invoices || []);
    },
  });

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const result = await fetchMore({
        variables: {
          first: INVOICES_PER_PAGE,
          offset: invoices.length,
        },
      });

      setInvoices(prev => [...prev, ...(result.data?.invoices || [])]);
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading && invoices.length === 0) {
    return (
      <div className="flex items-center justify-center h-[90vh] mx-auto">
        <Loading />
      </div>
    )
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

  // Determine if there are more items to load - check if we got exactly INVOICES_PER_PAGE items in the last fetch
  const hasMore = (data?.invoices?.length === INVOICES_PER_PAGE || invoices.length % INVOICES_PER_PAGE === 0) && invoices.length > 0;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderContent}>
          <p className={styles.pageLabel}>Billing</p>
          <h2 className={styles.pageTitle}>Invoices</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link href="/payments/new" className="btn-primary">
            <Icon name="money" size={10} />
          </Link>
          <BackButton href="/" classes="btn-secondary" title="Back to Dashboard" />
        </div>
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
        loading={loadingMore}
        initialFilter={initialFilter}
      />
    </div>
  );
}
