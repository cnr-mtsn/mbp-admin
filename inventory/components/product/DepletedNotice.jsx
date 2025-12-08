import React from 'react';
import styles from '../../styles/depleted-notice.module.css';

export default function DepletedNotice() {
  return (
    <div className={styles.container}>
      <div className="flex items-center">
        <svg className={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <h3 className={styles.title}>
            Product Depleted
          </h3>
          <p className={styles.message}>
            This product has been completely used and removed from active inventory.
          </p>
        </div>
      </div>
    </div>
  );
}
