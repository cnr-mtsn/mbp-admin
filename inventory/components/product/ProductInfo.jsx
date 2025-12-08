import React from 'react';
import { Card, CardHeader, CardBody } from '../ui';
import StatusBadge from '../StatusBadge';
import ProductDetailRow from './ProductDetailRow';
import styles from '../../styles/product-info.module.css';
import { parseGid } from '../../utils/helpers'

export default function ProductInfo({ product }) {
  const attributes = product.attributes || {};
  const brand = product.brand || attributes.brand || attributes.name;
  const color = product.color || attributes.colorName || attributes.finish;
  const colorCode = product.color_code || attributes.colorCode;
  const sheen = product.sheen || attributes.sheen || attributes.finish;
  const surfaceType = product.category || attributes.surfaceType || attributes.type;
  const containerSize = product.container_size || attributes.containerSize;
  const width = attributes.width;
  const jobName = attributes.jobName;
  const interiorOrExterior = attributes.interiorOrExterior;
  const hasVolume = attributes.volume !== undefined || ['paint', 'stain'].includes(product.product_type);
  const parsedAmount = parseFloat(product.amount_gallons);
  const parsedAttrVolume = parseFloat(attributes.volume);
  const amountGallons = !Number.isNaN(parsedAmount)
    ? parsedAmount
    : (!Number.isNaN(parsedAttrVolume) ? parsedAttrVolume : null);
  const amountDisplay = !hasVolume || amountGallons === null || Number.isNaN(amountGallons)
    ? 'N/A'
    : `${amountGallons.toFixed(2)} gallons`;
  const sheenLabel = product.product_type === 'stain' ? 'Finish' : 'Sheen';

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <h3 className="card-title">Product Details</h3>
            <p className={styles.subtitle}>
              ID: {parseGid(product.id)}
            </p>
          </div>
          <StatusBadge status={product.status} />
        </div>
      </CardHeader>
      <CardBody>
        <dl className="product-details">
          <ProductDetailRow label="Product Type" value={product.product_type} />
          {surfaceType && <ProductDetailRow label="Category" value={surfaceType} alternate />}
          {brand && <ProductDetailRow label="Brand" value={brand} />}
          {color && <ProductDetailRow label="Color" value={color} alternate />}
          {colorCode && <ProductDetailRow label="Color Code" value={colorCode} />}
          {sheen && <ProductDetailRow label={sheenLabel} value={sheen} alternate />}
          {width && <ProductDetailRow label="Width" value={width} />}
          {jobName && <ProductDetailRow label="Job Name" value={jobName} alternate />}
          {interiorOrExterior && <ProductDetailRow label="Interior/Exterior" value={interiorOrExterior} />}
          {containerSize && <ProductDetailRow label="Container Size" value={containerSize} alternate />}
          <ProductDetailRow
            label="Amount"
            value={amountDisplay}
            alternate
          />
          <ProductDetailRow
            label="Created"
            value={new Date(product.created_at).toLocaleString()}
          />
          {product.depleted_at && (
            <ProductDetailRow
              label="Depleted Date"
              value={new Date(product.depleted_at).toLocaleString()}
              valueStyle={{ color: 'var(--color-danger)', fontWeight: 'var(--font-weight-medium)' }}
              alternate
            />
          )}
        </dl>
      </CardBody>
    </Card>
  );
}
