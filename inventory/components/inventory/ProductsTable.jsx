import React from 'react';
import Link from 'next/link';
import StatusBadge from '../StatusBadge';
import { capitalize, parseGid } from '../../utils/helpers';
import styles from '../../styles/products-table.module.css';

export default function ProductsTable({ products }) {
  if (products.length === 0) {
    return null;
  }

  return (
    <div className={styles.grid}>
      {products.map((product) => {
        const attributes = product.attributes || {};
        const brand = product.brand || attributes.brand || attributes.name;
        const color = product.color || attributes.colorName || attributes.finish;
        const colorCode = product.color_code || attributes.colorCode;
        const sheen = product.sheen || attributes.sheen || attributes.finish;
        const category = product.category || attributes.surfaceType || attributes.type;
        const containerSize = product.container_size || attributes.containerSize;
        const hasVolume = attributes.volume !== undefined || ['paint', 'stain'].includes(product.product_type);
        const parsedAmount = parseFloat(product.amount_gallons);
        const parsedVolume = parseFloat(attributes.volume);
        const amountGallons = !Number.isNaN(parsedAmount)
          ? parsedAmount
          : (!Number.isNaN(parsedVolume) ? parsedVolume : null);
        const shouldShowAmount = hasVolume && amountGallons !== null && !Number.isNaN(amountGallons);

        return (
          <Link key={product.id} href={`/product/${parseGid(product.id)}`} className={styles.card}>
            {/* Header */}
            <div className={styles.cardHeader}>
              <div className={styles.productType}>
                {capitalize(product.product_type || 'Product')}
              </div>
              <StatusBadge status={product.status} />
            </div>

            {/* Main Info */}
            <div className={styles.cardBody}>
              {/* Primary Details */}
              <div className={styles.mainInfo}>
                {brand && (
                  <div className={styles.brand}>{brand}</div>
                )}
                {color && (
                  <div className={styles.color}>{color}</div>
                )}
                {colorCode && (
                  <div className={styles.colorCode}>Code: {colorCode}</div>
                )}
              </div>

              {/* Secondary Details */}
              <div className={styles.detailsGrid}>
                {category && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Category</span>
                    <span className={styles.detailValue}>{category}</span>
                  </div>
                )}
                {sheen && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Sheen / Finish</span>
                    <span className={styles.detailValue}>{sheen}</span>
                  </div>
                )}
                {shouldShowAmount && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Amount</span>
                    <span className={styles.detailValue}>
                      {amountGallons === 0
                        ? "Empty"
                        : `${amountGallons.toFixed(2)}${containerSize ? `/${containerSize}` : ''}`
                      }
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            {product.last_transaction_employee && (
              <div className={styles.cardFooter}>
                <div className={styles.lastUpdated}>
                  <svg className={styles.footerIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>{product.last_transaction_employee}</span>
                </div>
                <div className={styles.updateDate}>
                  <svg className={styles.footerIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span suppressHydrationWarning>
                    {new Date(product.last_transaction_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
