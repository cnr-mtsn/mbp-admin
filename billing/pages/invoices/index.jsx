import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { GET_INVOICES } from '../../lib/graphql/queries';
import { extractUuid } from '../../lib/utils/gid';
import { formatDate, formatMoney, RESULTS_PER_PAGE } from '../../lib/utils/helpers';
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

  // Get initial filter from query params
  const initialFilter = router.query.status || 'all';

  const { data, loading, error, fetchMore } = useQuery(GET_INVOICES, {
    variables: {
      first: RESULTS_PER_PAGE.invoices,
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
          first: RESULTS_PER_PAGE.invoices,
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
  const sentStatuses = ['sent', 'overdue'];
  const unpaidBalance = invoices
    .filter(invoice => sentStatuses.includes(invoice.status))
    .reduce((sum, invoice) => sum + (parseFloat(invoice.total) || 0), 0);

  // Determine if there are more items to load - check if we got exactly RESULTS_PER_PAGE.invoices items in the last fetch
  const hasMore = (data?.invoices?.length === RESULTS_PER_PAGE.invoices || invoices.length % RESULTS_PER_PAGE.invoices === 0) && invoices.length > 0;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderContent}>
          <p className={styles.pageLabel}>Billing</p>
          <h2 className={styles.pageTitle}>Invoices</h2>
        </div>
        <div className="flex gap-2">
          <Link href="/payments/new" className="btn-primary">
            <Icon name="money" size={10} />
          </Link>
          <BackButton href="/" classes="btn-secondary" title="Back to Dashboard" />
        </div>
      </div>

      {/* Total Unpaid Balance */}
      <div className={`card ${styles.cardSpacing}`}>
        <div className={styles.summaryCardItem}>
          <p className={styles.summaryCardLabel}>
            Total Unpaid Balance
          </p>
          <p className={styles.summaryValueLargeLoss}>
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
