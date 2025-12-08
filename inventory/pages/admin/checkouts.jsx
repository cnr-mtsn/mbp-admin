import { useState, useEffect } from 'react';
import Link from 'next/link';
import { productsAPI } from '../../api/client';
import { Card, Loading, Button } from '../../components/ui';
import styles from '../../styles/checkouts.module.css';
import useAuthStore from '../../store/authStore'
import CheckoutCard from '../../components/checkouts/CheckoutCard';

export default function AdminCheckouts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const userRole = useAuthStore((state) => state.user?.role);


  useEffect(() => {
    loadAllCheckouts();
  }, []);

  const loadAllCheckouts = async () => {
    try {
      setLoading(true);
      const response = await productsAPI.getAllCheckedOut();
      setProducts(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load checked out products');
      console.error('Load all checkouts error:', err);
    } finally {
      setLoading(false);
    }
  };

  if(userRole !== "admin") return null

  if (loading) {
    return (
      <div className="page">
        <Loading message="Loading all checked out products..." />
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">All Checked Out Items</h1>
      <p className={styles.description}>
        View and manage all products currently checked out by employees.
      </p>

      {error && (
        <div className="alert alert-danger">
          {error}
          <Button onClick={loadAllCheckouts} variant="outline" size="sm" className="mt-sm">
            Try again
          </Button>
        </div>
      )}

      {products.length === 0 ? (
        <Card>
          <div className="card-body text-center">
            <div className={styles.emptyState}>
              No products are currently checked out.
            </div>
            <Link href="/inventory" className="btn btn-primary mt-md">
              View Inventory
            </Link>
          </div>
        </Card>
      ) : (
        <div className={styles.checkoutList}>
          {products.map((product) => (
            <CheckoutCard
              key={product.id}
              product={product}
              showEmployee
            />
          ))}
        </div>
      )}
    </div>
  );
}
