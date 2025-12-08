import Link from 'next/link';
import { capitalize } from '../../utils/helpers';
import styles from '../../styles/transaction-card.module.css';

export default function Transaction({ transaction }) {
  if (!transaction) return null;

  const href = `/product/${transaction.product_id}`;
  const type = transaction.transaction_type;

  const badgeClass = (() => {
    if (type === 'check-in') return styles.badgeCheckIn;
    if (type === 'check-out') return styles.badgeCheckOut;
    return styles.badgeDepleted;
  })();

  return (
    <li className={styles.transactionItem}>
      <Link href={href} className={styles.transactionLink}>
        <div className={styles.transactionContent}>
          <div className={styles.transactionMain}>
            <div className={styles.transactionInfo}>
              <p className={styles.transactionProduct}>
                {capitalize(transaction.product_type)} - {capitalize(transaction.brand || 'N/A')}
              </p>
              <p className={styles.transactionCategory}>
                {capitalize(transaction.color || transaction.category || '')}
              </p>
            </div>
            <div className={styles.transactionBadge}>
              <span className={`${styles.badge} ${badgeClass}`}>
                {transaction.transaction_type}
              </span>
            </div>
          </div>
          <div className={styles.transactionDetails}>
            <div className={styles.transactionEmployee}>
              <p>
                {transaction.employee_name}
              </p>
            </div>
            <div className={styles.transactionDate}>
              <p suppressHydrationWarning>
                {new Date(transaction.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </Link>
    </li>
  );
}
