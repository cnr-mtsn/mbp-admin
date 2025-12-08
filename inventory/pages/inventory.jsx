import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { productsAPI } from '../api/client';
import { Button, Loading, FormInput } from '../components/ui';
import ProductsTable from '../components/inventory/ProductsTable';
import QRScanner from '../components/inventory/QRScanner';
import styles from '../styles/inventory.module.css';

export default function Inventory() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [viewFilter, setViewFilter] = useState('all');
  const viewParam = router.query?.view;

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadProducts(searchTerm);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  useEffect(() => {
    if (!router.isReady) return;
    const view = viewParam;

    if (view === 'available' || view === 'low-stock') {
      setViewFilter(view);
    } else {
      setViewFilter('all');
    }
  }, [router.isReady, viewParam]);

  const loadProducts = async (search = '') => {
    try {
      setLoading(true);
      const response = await productsAPI.getAll(search);
      setProducts(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load products');
      console.error('Load products error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleScan = (productId) => {
    console.log("Handle scan: ", productId);
    router.push(`/product/${productId}`);
  };

  const isLowStockProduct = (product) => {
    if (!product) return false;
    const type = product.product_type?.toLowerCase();
    const amount = parseFloat(product.amount_gallons);
    return (
      ['paint', 'stain'].includes(type) &&
      product.status === 'available' &&
      !Number.isNaN(amount) &&
      amount > 0 &&
      amount < 0.5
    );
  };

  const filteredProducts = useMemo(() => {
    if (viewFilter === 'available') {
      return products.filter((product) => product.status === 'available');
    }
    if (viewFilter === 'low-stock') {
      return products.filter(isLowStockProduct);
    }
    return products;
  }, [products, viewFilter]);

  const filterLabels = {
    available: 'Available inventory',
    'low-stock': 'Low stock inventory'
  };

  const clearFilter = () => {
    router.push('/inventory');
  };

  const isFiltered = viewFilter !== 'all';

  const emptyStateMessage = (() => {
    if (searchTerm) {
      return 'No products found matching your search.';
    }
    if (viewFilter === 'available') {
      return 'No products are currently available.';
    }
    if (viewFilter === 'low-stock') {
      return 'No products are currently in low stock.';
    }
    return 'No products in inventory yet.';
  })();

  return (
    <div className="page">
      <div className={styles.header}>
        <h1 className="page-title">Inventory</h1>
        <div className={styles.actions}>
          <Button
            onClick={() => setShowScanner(!showScanner)}
            variant="success"
          >
            <svg className={styles.buttonIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            {showScanner ? 'Stop Scanning' : 'Scan QR Code'}
          </Button>
          <Link href="/add-product" className="btn btn-primary">
            <svg className={styles.buttonIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Check In
          </Link>
        </div>
      </div>

      {showScanner && (
        <QRScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      <div className={styles.searchContainer}>
        <div className={styles.searchWrapper}>
          <div className={styles.searchIcon}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <FormInput
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by ID, brand, color, code, or category..."
            className="pl-10"
          />
        </div>
      </div>

      {isFiltered && (
        <div className={styles.filterBanner}>
          <div>
            <p className={styles.filterLabel}>{filterLabels[viewFilter]}</p>
            <p className={styles.filterDescription}>
              Showing products filtered from the full inventory.
            </p>
          </div>
          <button onClick={clearFilter} className={styles.clearFilterButton}>
            Clear filter
          </button>
        </div>
      )}

      {loading ? (
        <Loading message="Loading products..." />
      ) : error ? (
        <div className="alert alert-danger">
          {error}
          <Button onClick={() => loadProducts(searchTerm)} variant="outline" size="sm" className="mt-sm">
            Try again
          </Button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="card">
          <div className="card-body text-center">
            <div className={styles.emptyState}>
              {emptyStateMessage}
            </div>
            <Link href="/add-product" className="btn btn-primary mt-md">
              Check In First Product
            </Link>
          </div>
        </div>
      ) : (
        <ProductsTable products={filteredProducts} />
      )}
    </div>
  );
}
