import Link from 'next/link';
import { Card } from '../ui';
import { capitalize, parseGid } from '../../utils/helpers';
import styles from '../../styles/checkouts.module.css';

export default function CheckoutCard({
  product,
  showEmployee = false,
  actionLabel = 'Check In'
}) {
  if (!product) return null;

  const attributes = product.attributes || {};
  const brand = product.brand || attributes.brand || attributes.name;
  const color = product.color || attributes.colorName || attributes.finish;
  const colorCode = product.color_code || attributes.colorCode;
  const sheen = product.sheen || attributes.sheen || attributes.finish;
  const width = attributes.width;
  const surfaceType = product.category || attributes.surfaceType || attributes.type;
  const containerSize = product.container_size || attributes.containerSize;
  const hasVolume = attributes.volume !== undefined || ['paint', 'stain'].includes(product.product_type);
  const parsedAmount = parseFloat(product.amount_gallons);
  const parsedAttributeVolume = parseFloat(attributes.volume);
  const amountGallons = !Number.isNaN(parsedAmount)
    ? parsedAmount
    : (!Number.isNaN(parsedAttributeVolume) ? parsedAttributeVolume : null);
  const showAmount = hasVolume && amountGallons !== null && !Number.isNaN(amountGallons);
  const checkoutDate = product.checkout_date ? new Date(product.checkout_date) : null;

  return (
    <Card className={styles.checkoutCard}>
      <div className={styles.checkoutHeader}>
        <div>
          <p className={styles.productType}>
            {capitalize(product.product_type || 'Product')}
          </p>
          {surfaceType && (
            <p className={styles.productCategory}>{surfaceType}</p>
          )}
        </div>

        {showEmployee && product.checkout_employee && (
          <div className={styles.checkoutMeta}>
            <span className={styles.metaLabel}>Checked out by</span>
            <span className={styles.employeeName}>{product.checkout_employee}</span>
          </div>
        )}
      </div>

      <div className={styles.detailGrid}>
        {brand && (
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Brand</span>
            <span className={styles.detailValue}>{brand}</span>
          </div>
        )}
        {color && (
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Color</span>
            <span className={styles.detailValue}>{color}</span>
          </div>
        )}
        {colorCode && (
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Color Code</span>
            <span className={styles.detailValue}>{colorCode}</span>
          </div>
        )}
        {sheen && (
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Sheen / Finish</span>
            <span className={styles.detailValue}>{sheen}</span>
          </div>
        )}
        {width && (
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Width</span>
            <span className={styles.detailValue}>{width}</span>
          </div>
        )}
      </div>

      <div className={styles.checkoutFooter}>
        <div className={styles.checkoutStats}>
          {showAmount && (
            <div className={styles.stat}>
              <span className={styles.detailLabel}>Amount</span>
              <span className={styles.amountText}>
                {parseFloat(amountGallons).toFixed(2)} gal
                {containerSize && (
                  <span className={styles.containerSize}>
                    ({containerSize})
                  </span>
                )}
              </span>
            </div>
          )}
          {checkoutDate && (
            <div className={styles.stat}>
              <span className={styles.detailLabel}>Checked Out</span>
              <span className={styles.dateText}>
                {checkoutDate.toLocaleDateString()}
                <span className={styles.timeText}>
                  {checkoutDate.toLocaleTimeString()}
                </span>
              </span>
            </div>
          )}
        </div>

        <Link
          href={`/product/${parseGid(product.id)}`}
          className="btn btn-success btn-sm"
        >
          {actionLabel}
        </Link>
      </div>
    </Card>
  );
}
