import React from 'react';
import Transaction from './Transaction';
import styles from '../../styles/transaction-card.module.css';

export default function TransactionList({ transactions = [], className = '' }) {
  if (!transactions?.length) {
    return null;
  }

  return (
    <ul className={`${styles.transactionList} ${className}`}>
      {transactions.map((transaction) => (
        <Transaction key={transaction.id} transaction={transaction} />
      ))}
    </ul>
  );
}
