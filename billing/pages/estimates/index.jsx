import { useRouter } from 'next/router';
import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { GET_ESTIMATES } from '../../lib/graphql/queries';
import { extractUuid } from '../../lib/utils/gid';
import { formatDate, formatMoney } from '../../lib/utils/helpers';
import styles from '../../styles/pages.module.css';
import cardStyles from '../../styles/cardItems.module.css';
import Icon from '../../components/ui/Icon'
import BackButton from '../../components/ui/BackButton'

const statusStyles = {
  accepted: styles.statusAccepted,
  rejected: styles.statusRejected,
  sent: styles.statusSent,
  draft: styles.statusDraft,
};

export default function Estimates() {
  const router = useRouter();
  const { data, loading, error } = useQuery(GET_ESTIMATES);

  if (loading) {
    return (
      <div className={styles.centerState}>
        <div className={styles.stateContent}>
          <h1 className={styles.stateTitle}>Loading estimates...</h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.centerState}>
        <div className={styles.stateContent}>
          <h1 className={styles.stateTitleError}>Error loading estimates</h1>
          <p className={styles.stateMessage}>{error.message}</p>
        </div>
      </div>
    );
  }

  const estimates = data?.estimates || [];

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderContent}>
          <p className={styles.pageLabel}>Sales</p>
          <h2 className={styles.pageTitle}>Estimates</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link href="/estimates/new" className="btn-primary">
            <Icon name="add" />        
          </Link>
          <BackButton href="/" classes="btn-secondary" title="Back to Dashboard" />
        </div>
      </div>

      <div className={styles.cardGrid}>
        {estimates.map((estimate) => {
          const statusClass = statusStyles[estimate.status] || statusStyles.draft;
          return (
            <div key={estimate.id} className="card">
              <div className={cardStyles.itemHeader}>
                <div className={cardStyles.itemHeaderContent}>
                  <p className={cardStyles.itemLabel}>Estimate</p>
                  <h3 className={cardStyles.itemTitle}>{estimate.title}</h3>
                  <p className={cardStyles.itemDescription}>{estimate.description || 'No description provided.'}</p>
                </div>
                <span className={`pill ${statusClass}`}>{estimate.status}</span>
              </div>

              <div className={cardStyles.itemTags}>
                <span className={cardStyles.itemTag}>
                  {estimate.customer?.name || 'No customer'}
                </span>
                <span className={cardStyles.itemTag}>
                  {estimate.customer?.email || 'No email'}
                </span>
              </div>

              <div className={cardStyles.itemFooter}>
                <div>
                  <p className={cardStyles.itemTitle}>{formatMoney(estimate.total || 0)}</p>
                  <p className={cardStyles.itemDescription}>Created {formatDate(estimate.created_at)}</p>
                </div>
                <Link href={`/estimates/${extractUuid(estimate.id)}`} className="btn-primary-sm">
                  View
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {estimates.length === 0 && (
        <div className={`card ${styles.emptyState}`}>
          <p className="muted">No estimates found</p>
        </div>
      )}
    </div>
  );
}
