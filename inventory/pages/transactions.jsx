import { useState, useEffect } from 'react';
import { analyticsAPI } from '../api/client';
import { Loading, Button } from '../components/ui';
import TransactionList from '../components/transactions/TransactionList';
import styles from '../styles/transactions.module.css';

const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return {
    start_date: start.toISOString(),
    end_date: end.toISOString(),
  };
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const dateRange = getTodayRange();
      const response = await analyticsAPI.getTransactions(dateRange);
      setTransactions(response.data || []);
      setError(null);
    } catch (err) {
      console.error('Load transactions error:', err);
      setError('Failed to load today\'s transactions.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <Loading message="Loading today's transactions..." />
      </div>
    );
  }
  return (
    <div className="page">
      <div className={styles.header}>
        <h1 className="page-title">Today's Transactions</h1>
        <p className={styles.description}>
          Detailed view of every check-in and check-out that happened today.
        </p>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
          <Button onClick={loadTransactions} variant="outline" size="sm" className="mt-sm">
            Try again
          </Button>
        </div>
      )}

      {!transactions || transactions.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <div className={styles.emptyState}>
              No transactions have been recorded today.
            </div>
          </div>
        </div>
      ) : (
        <TransactionList transactions={transactions.transactions} />
      )}
    </div>
  );
}
