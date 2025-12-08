import React from 'react';
import { Badge } from '../ui';
import styles from '../../styles/transaction-history.module.css';

const getVariant = (type) => {
  if (type === 'check-in') return 'success';
  if (type === 'depleted') return 'danger';
  return 'gray';
};

export default function TransactionItem({ transaction }) {
  const parsedAmount = parseFloat(transaction?.amount_gallons);
  const amountDisplay = Number.isNaN(parsedAmount)
    ? '—'
    : `${parsedAmount.toFixed(2)} gallons`;

  if (!transaction) return null;

  return (
    <li className={styles.item}>
      <div className="flex justify-between items-center">
        <div style={{ flex: 1 }}>
          <p className={styles.employeeName}>
            {transaction.employee_name}
          </p>
          <p className={styles.amount}>
            {amountDisplay}
          </p>
        </div>
        <div className={styles.rightColumn}>
          <Badge variant={getVariant(transaction.transaction_type)}>
            {transaction.transaction_type}
          </Badge>
          <span className={styles.timestamp}>
            {new Date(transaction.created_at).toLocaleString()}
          </span>
        </div>
      </div>
    </li>
  );
}
