import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { GET_EXPENSES } from '../../lib/graphql/queries';
import { formatMoney } from '../../lib/utils/helpers';
import styles from '../../styles/pages.module.css';
import ExpensesGrid from '../../components/expense/ExpensesGrid';
import BackButton from '../../components/ui/BackButton';
import Loading from '../../components/ui/Loading';
import Icon from '../../components/ui/Icon';

export default function Expenses() {
  const router = useRouter();
  const [expenses, setExpenses] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);

  const EXPENSES_PER_PAGE = 100;

  const { data, loading, error, fetchMore } = useQuery(GET_EXPENSES, {
    variables: {
      first: EXPENSES_PER_PAGE,
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
          first: EXPENSES_PER_PAGE,
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
  const hasMore = (data?.expenses?.length === EXPENSES_PER_PAGE || expenses.length % EXPENSES_PER_PAGE === 0) && expenses.length > 0;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderContent}>
          <p className={styles.pageLabel}>Job Expenses</p>
          <h2 className={styles.pageTitle}>All Expenses</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {unassignedCount > 0 && (
            <Link href="/expenses/unassigned" className="btn-secondary">
              Unassigned ({unassignedCount})
            </Link>
          )}
          <Link href="/expenses/new" className="btn-primary">
            <Icon name="add" size={10} />
          </Link>
          <BackButton href="/" classes="btn-secondary" title="Back to Dashboard" />
        </div>
      </div>

      {/* Summary Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', padding: '1rem 0' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              Total Expenses
            </p>
            <p style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--color-danger)' }}>
              {formatMoney(totalExpenses)}
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              Pending Review
            </p>
            <p style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--status-overdue-text)' }}>
              {pendingCount}
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              Unassigned
            </p>
            <p style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--status-overdue-text)' }}>
              {unassignedCount}
            </p>
          </div>
        </div>
      </div>

      <ExpensesGrid
        expenses={expenses}
        onLoadMore={handleLoadMore}
        hasMore={hasMore}
        loading={loadingMore}
      />
    </div>
  );
}
