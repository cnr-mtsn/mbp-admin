import React from 'react';
import { Card, CardHeader, CardBody } from '../ui';
import TransactionItem from './TransactionItem';
import styles from '../../styles/transaction-history.module.css';

export default function TransactionHistory({ transactions = [] }) {
  return (
    <Card>
      <CardHeader>
        <h3 className="card-title">Transaction History</h3>
      </CardHeader>
      {transactions.length > 0 ? (
        <ul className={styles.list}>
          {transactions.map((transaction) => (
            <TransactionItem key={transaction.id} transaction={transaction} />
          ))}
        </ul>
      ) : (
        <CardBody>
          <div className={`text-center ${styles.emptyState}`}>
            No transaction history
          </div>
        </CardBody>
      )}
    </Card>
  );
}
