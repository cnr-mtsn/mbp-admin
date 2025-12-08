import { useRouter } from 'next/router';
import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { GET_CUSTOMERS } from '../../lib/graphql/queries';
import { extractUuid } from '../../lib/utils/gid';
import { formatDate } from '../../lib/utils/helpers';
import styles from '../../styles/pages.module.css';
import cardStyles from '../../styles/cardItems.module.css';

export default function Customers() {
  const router = useRouter();
  const { data, loading, error } = useQuery(GET_CUSTOMERS, {
    variables: { sortKey: 'name' }
  });

  if (loading) {
    return (
      <div className={styles.centerState}>
        <div className={styles.stateContent}>
          <h1 className={styles.stateTitle}>Loading customers...</h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.centerState}>
        <div className={styles.stateContent}>
          <h1 className={styles.stateTitleError}>Error loading customers</h1>
          <p className={styles.stateMessage}>{error.message}</p>
        </div>
      </div>
    );
  }

  const customers = data?.customers || [];

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderContent}>
          <p className={styles.pageLabel}>Directory</p>
          <h2 className={styles.pageTitle}>Customers</h2>
        </div>
        <Link href="/" className="btn-secondary">Back to Dashboard</Link>
      </div>

      <div className={styles.cardGrid}>
        {customers.map((customer) => (
          <div key={customer.id} className="card">
            <div className={cardStyles.itemHeader}>
              <div className={cardStyles.itemHeaderContent}>
                <p className={cardStyles.itemLabel}>Customer</p>
                <h3 className={cardStyles.itemTitle}>{customer.name}</h3>
                <p className={cardStyles.itemDescription}>{customer.email || 'No email provided'}</p>
              </div>
              <div className="pill-primary">
                {customer.city || customer.state ? 'Active' : 'New'}
              </div>
            </div>

            <div className={cardStyles.itemContact}>
              <p className={cardStyles.itemContactText}>
                📞 {customer.phone || 'No phone'}
              </p>
              <p className={cardStyles.itemContactText}>
                📍 {customer.city && customer.state ? `${customer.city}, ${customer.state}` : 'Location TBD'}
              </p>
            </div>

            <div className={cardStyles.itemFooter}>
              <span className={cardStyles.itemFooterText}>
                Joined {customer.created_at ? formatDate(customer.created_at) : '-'}
              </span>
              <Link href={`/customers/${extractUuid(customer.id)}`} className="btn-primary-sm">
                View
              </Link>
            </div>
          </div>
        ))}
      </div>

      {customers.length === 0 && (
        <div className={`card ${styles.emptyState}`}>
          <p className="muted">No customers found</p>
        </div>
      )}
    </div>
  );
}
