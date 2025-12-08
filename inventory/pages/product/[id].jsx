import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ProductProvider, useProduct } from '../../contexts/ProductContext';
import { useNotification } from '../../contexts/NotificationContext';
import { Button, Loading } from '../../components/ui';
import ProductInfo from '../../components/product/ProductInfo';
import CheckoutForm from '../../components/product/CheckoutForm';
import CheckinForm from '../../components/product/CheckinForm';
import DepletedNotice from '../../components/product/DepletedNotice';
import TransactionHistory from '../../components/transactions/TransactionHistory';
import QRCodeSection from '../../components/product/QRCodeSection';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import styles from '../../styles/product-detail.module.css';
import { parseGid } from '../../utils/helpers'

function ProductDetailContent() {
  const router = useRouter();
  const { id } = router.query;
  const {
    product,
    transactions,
    loading,
    error,
    loadProduct,
    checkOut,
    checkIn,
    deleteProduct,
    loadQRCode
  } = useProduct();
  const { showNotification } = useNotification();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if(id) loadProduct(id);
  }, [id]);

  const handleCheckout = async (formData) => {
    const success = await checkOut(id, formData);
    if (success) {
      showNotification('Product checked out successfully!');
    } else {
      showNotification('Failed to check out product. Please try again.', { type: 'error' });
    }
    return success;
  };

  const handleCheckin = async (formData) => {
    const success = await checkIn(id, formData);
    if (success) {
      const message = formData.mark_as_depleted
        ? 'Product marked as depleted and removed from active inventory.'
        : 'Product checked in successfully!';
      showNotification(message);
    } else {
      showNotification('Failed to check in product. Please try again.', { type: 'error' });
    }
    return success;
  };

  const handleDelete = async () => {
    const success = await deleteProduct(id);
    if (success) {
      showNotification('Product deleted successfully');
      router.push('/inventory');
    } else {
      showNotification('Failed to delete product. Please try again.', { type: 'error' });
    }
  };

  if (loading && !product) {
    return (
      <div className="page">
        <Loading message="Loading product..." />
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="page">
        <div className="alert alert-danger">
          {error}
          <Link href="/inventory" className="btn btn-outline mt-md">
            Back to Inventory
          </Link>
        </div>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <div className="page">
      <div className={styles.header}>
        <Link href="/inventory" className="nav-link">
          <svg className={styles.backIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Inventory
        </Link>
        <Button onClick={() => setShowDeleteConfirm(true)} variant="danger" size="sm">
          Delete Product
        </Button>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => {
          setShowDeleteConfirm(false);
          handleDelete();
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <div className={styles.mainGrid}>
        <div className={styles.contentGrid}>
          {/* Product Info */}
          <div>
            <ProductInfo product={product} />
            <QRCodeSection
              productId={parseGid(product.id)}
              productType={product.product_type}
              onLoadQRCode={loadQRCode}
            />
          </div>

          {/* Actions & Transactions */}
          <div className={styles.actionsColumn}>
            {product.status === 'depleted' && <DepletedNotice />}
            {product.status === 'available' && <CheckoutForm onCheckout={handleCheckout} loading={loading} error={error} />}
            {product.status === 'checked-out' && <CheckinForm product={product} onCheckin={handleCheckin} loading={loading} error={error} />}
            <TransactionHistory transactions={transactions} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductDetail() {
  return (
    <ProductProvider>
      <ProductDetailContent />
    </ProductProvider>
  );
}
