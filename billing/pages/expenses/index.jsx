import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { GET_EXPENSES } from '../../lib/graphql/queries';
import { formatMoney, RESULTS_PER_PAGE } from '../../lib/utils/helpers';
import styles from '../../styles/pages.module.css';
import ExpensesGrid from '../../components/expense/ExpensesGrid';
import BackButton from '../../components/ui/BackButton';
import Loading from '../../components/ui/Loading';
import Icon from '../../components/ui/Icon';

export default function Expenses() {
  const router = useRouter();
  const [expenses, setExpenses] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);

  const { data, loading, error, fetchMore } = useQuery(GET_EXPENSES, {
    variables: {
      first: RESULTS_PER_PAGE.expenses,
      offset: 0,
    },
    notifyOnNetworkStatusChange: false,
    onCompleted: (data) => {
      setExpenses(data?.expenses || []);
    },
  });

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const result = await fetchMore({
        variables: {
          first: RESULTS_PER_PAGE.expenses,
          offset: expenses.length,
        },
      });

      setExpenses(prev => [...prev, ...(result.data?.expenses || [])]);
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

  // Calculate totals
  const totalExpenses = expenses.reduce((sum, expense) => sum + (parseFloat(expense.total) || 0), 0);
  const pendingCount = expenses.filter(e => e.status === 'pending_review').length;
  const unassignedCount = expenses.filter(e => !e.job_id).length;

  // Determine if there are more items to load
  const hasMore = (data?.expenses?.length === RESULTS_PER_PAGE.expenses || expenses.length % RESULTS_PER_PAGE.expenses === 0) && expenses.length > 0;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderContent}>
          <p className={styles.pageLabel}>Job Expenses</p>
          <h2 className={styles.pageTitle}>All Expenses</h2>
        </div>
        <div className="flex gap-2 items-center">
          {unassignedCount > 0 && (
            <Link href="/expenses/unassigned" className="btn-secondary hidden md:inline-flex">
              Unassigned ({unassignedCount})
            </Link>
          )}
          <Link
            href="/expenses/new"
            className={`btn-primary ${styles.iconButton}`}
          >
            <Icon name="add" size={10} />
          </Link>
          <BackButton href="/" classes="btn-secondary" title="Back to Dashboard" />
        </div>
      </div>

      {/* Summary Card */}
      <div className={`card ${styles.cardSpacing} ${styles.cardStatic}`}>
        <div className={styles.summaryCardGrid}>
          <div className={styles.summaryCardItem}>
            <p className={styles.summaryCardLabel}>Total Expenses</p>
            <p className={`${styles.summaryCardValue} ${styles.summaryValueDanger}`}>
              {formatMoney(totalExpenses)}
            </p>
          </div>
          <div className={styles.summaryCardItem}>
            <p className={styles.summaryCardLabel}>Pending Review</p>
            <p className={styles.summaryCardValueWarning}>
              {pendingCount}
            </p>
          </div>
          <div className={styles.summaryCardItem}>
            <p className={styles.summaryCardLabel}>Unassigned</p>
            <p className={styles.summaryCardValueWarning}>
              {unassignedCount}
            </p>
          </div>
        </div>
      </div>

      {/* Unassigned Expenses Card - Mobile Navigation */}
      {unassignedCount > 0 && (
        <Link href="/expenses/unassigned" className={`${styles.cardSpacing} block`}>
          <div className="card md:hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className={styles.listItemMeta}>
                  View Unassigned Expenses
                </p>
                <p className={styles.summaryValueLoss}>
                  {unassignedCount} expense{unassignedCount !== 1 ? 's' : ''} need assignment
                </p>
              </div>
              <Icon name="chevron-right" size={12} />
            </div>
          </div>
        </Link>
      )}

      <ExpensesGrid
        expenses={expenses}
        onLoadMore={handleLoadMore}
        hasMore={hasMore}
        loading={loadingMore}
      />
    </div>
  );
}
