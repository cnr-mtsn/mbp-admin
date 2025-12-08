import { useState, useEffect } from 'react';
import Link from 'next/link';
import { productsAPI } from '../api/client';
import { Card, Loading, Button } from '../components/ui';
import styles from '../styles/checkouts.module.css';
import CheckoutCard from '../components/checkouts/CheckoutCard';

export default function MyCheckouts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMyCheckouts();
  }, []);

  const loadMyCheckouts = async () => {
    try {
      setLoading(true);
      const response = await productsAPI.getMyCheckedOut();
      setProducts(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load your checked out products');
      console.error('Load my checkouts error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <Loading message="Loading your checked out products..." />
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">My Checked Out Items</h1>

      {error && (
        <div className="alert alert-danger">
          {error}
          <Button onClick={loadMyCheckouts} variant="outline" size="sm" className="mt-sm">
            Try again
          </Button>
        </div>
      )}

      {products.length === 0 ? (
        <Card>
          <div className="card-body text-center">
            <div className={styles.emptyState}>
              You don't have any products checked out.
            </div>
            <Link href="/inventory" className="btn btn-primary mt-md">
              Browse Inventory
            </Link>
          </div>
        </Card>
      ) : (
        <div className={styles.checkoutList}>
          {products.map((product) => (
            <CheckoutCard
              key={product.id}
              product={product}
            />
          ))}
        </div>
      )}
    </div>
  );
}
