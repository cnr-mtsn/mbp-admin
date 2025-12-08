import React from 'react';
import styles from '../../styles/product-info.module.css';

export default function ProductDetailRow({ label, value, alternate, valueStyle = {} }) {
  const rowClass = alternate
    ? `${styles.detailRow} ${styles.detailRowAlternate}`
    : styles.detailRow;

  return (
    <div className={`product-detail-row ${rowClass}`}>
      <dt className={styles.detailLabel}>
        {label}
      </dt>
      <dd className={styles.detailValue} style={valueStyle}>
        {value}
      </dd>
    </div>
  );
}
