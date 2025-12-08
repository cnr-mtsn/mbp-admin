import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { ME } from '../lib/graphql/queries';
import styles from '../styles/pages.module.css';
import cardStyles from '../styles/cardItems.module.css';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  const { data, loading, error } = useQuery(ME);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        setUser(JSON.parse(userStr));
      }
    }
  }, []);

  useEffect(() => {
    if (data?.me) {
      setUser(data.me);
      localStorage.setItem('user', JSON.stringify(data.me));
    }
  }, [data]);

  if (loading) {
    return (
      <div className={styles.centerState}>
        <div className={styles.stateContent}>
          <h1 className={styles.stateTitle}>Loading...</h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.centerState}>
        <div className={styles.stateContent}>
          <h1 className={styles.stateTitleError}>Error loading dashboard</h1>
          <p className={styles.stateMessage}>{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <h2 className={styles.pageTitle}>Dashboard</h2>

      <div className={styles.dashboardGrid}>
        <Link href="/customers" className={`card ${cardStyles.dashboardCard}`}>
          <div className={cardStyles.dashboardCardContent}>
            <div className={cardStyles.dashboardCardInfo}>
              <h3 className={cardStyles.dashboardCardTitle}>Customers</h3>
              <p className={cardStyles.dashboardCardDescription}>Manage customers</p>
            </div>
            <div className={cardStyles.dashboardCardIcon}>👥</div>
          </div>
        </Link>

        <Link href="/jobs" className={`card ${cardStyles.dashboardCard}`}>
          <div className={cardStyles.dashboardCardContent}>
            <div className={cardStyles.dashboardCardInfo}>
              <h3 className={cardStyles.dashboardCardTitle}>Jobs</h3>
              <p className={cardStyles.dashboardCardDescription}>Track active jobs</p>
            </div>
            <div className={cardStyles.dashboardCardIcon}>🏗️</div>
          </div>
        </Link>

        <Link href="/estimates" className={`card ${cardStyles.dashboardCard}`}>
          <div className={cardStyles.dashboardCardContent}>
            <div className={cardStyles.dashboardCardInfo}>
              <h3 className={cardStyles.dashboardCardTitle}>Estimates</h3>
              <p className={cardStyles.dashboardCardDescription}>Create estimates</p>
            </div>
            <div className={cardStyles.dashboardCardIcon}>📋</div>
          </div>
        </Link>

        <Link href="/invoices" className={`card ${cardStyles.dashboardCard}`}>
          <div className={cardStyles.dashboardCardContent}>
            <div className={cardStyles.dashboardCardInfo}>
              <h3 className={cardStyles.dashboardCardTitle}>Invoices</h3>
              <p className={cardStyles.dashboardCardDescription}>Manage invoices</p>
            </div>
            <div className={cardStyles.dashboardCardIcon}>💰</div>
          </div>
        </Link>
      </div>
    </div>
  );
}
