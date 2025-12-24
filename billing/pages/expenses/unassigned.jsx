import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { GET_UNASSIGNED_EXPENSES } from '../../lib/graphql/queries';
import { formatMoney } from '../../lib/utils/helpers';
import styles from '../../styles/pages.module.css';
import ExpenseCard from '../../components/expense/ExpenseCard';
import BackButton from '../../components/ui/BackButton';
import Loading from '../../components/ui/Loading';

export default function UnassignedExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);

  const EXPENSES_PER_PAGE = 20;

  const { data, loading, error, fetchMore } = useQuery(GET_UNASSIGNED_EXPENSES, {
    variables: {
      first: EXPENSES_PER_PAGE,
      offset: 0,
    },
    notifyOnNetworkStatusChange: false,
    onCompleted: (data) => {
      setExpenses(data?.unassignedExpenses || []);
    },
  });

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const result = await fetchMore({
        variables: {
          first: EXPENSES_PER_PAGE,
          offset: expenses.length,
        },
      });

      setExpenses(prev => [...prev, ...(result.data?.unassignedExpenses || [])]);
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading && expenses.length === 0) {
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
          <h1 className={styles.stateTitleError}>Error loading expenses</h1>
          <p className={styles.stateMessage}>{error.message}</p>
        </div>
      </div>
    );
  }

  const totalUnassigned = expenses.reduce((sum, expense) => sum + (parseFloat(expense.total) || 0), 0);
  const hasMore = (data?.unassignedExpenses?.length === EXPENSES_PER_PAGE || expenses.length % EXPENSES_PER_PAGE === 0) && expenses.length > 0;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderContent}>
          <p className={styles.pageLabel}>Job Expenses</p>
          <h2 className={styles.pageTitle}>Unassigned Expenses</h2>
          <p className={styles.pageDescription}>
            Review and assign these expenses to jobs
          </p>
        </div>
        <BackButton href="/expenses" classes="btn-secondary" title="Back to All Expenses" />
      </div>

      {/* Summary Card */}
      <div className={`card ${styles.cardSpacing}`}>
        <div className={`${styles.summaryCardItem} py-4`}>
          <p className={styles.summaryCardLabel}>
            Total Unassigned Expenses
          </p>
          <p className={`text-3xl font-semibold ${styles.summaryValueLoss}`}>
            {formatMoney(totalUnassigned)}
          </p>
          <p className={`${styles.summaryCardLabel} mt-2`}>
            {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'} awaiting assignment
          </p>
        </div>
      </div>

      {expenses.length === 0 ? (
        <div className={`card ${styles.emptyState}`}>
          <p className="muted">No unassigned expenses found</p>
          <p className={`${styles.listItemMeta} mt-2`}>
            All expenses have been assigned to jobs
          </p>
        </div>
      ) : (
        <>
          <div className={styles.autoFillCardGrid}>
            {expenses.map((expense) => (
              <ExpenseCard key={expense.id} expense={expense} />
            ))}
          </div>

          {/* Show More Button */}
          {hasMore && (
            <div className={styles.loadMoreContainer}>
              {loadingMore ? (
                <Loading />
              ) : (
                <button onClick={handleLoadMore} className="btn-primary">
                  Show More
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
