import { createContext, useContext, useState } from 'react';
import { productsAPI } from '../api/client';

const ProductContext = createContext();

export function useProduct() {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProduct must be used within ProductProvider');
  }
  return context;
}

export function ProductProvider({ children }) {
  const [product, setProduct] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadProduct = async (id) => {
    try {
      setLoading(true);
      setError(null);
      console.log("Get product by id:", id);
      const response = await productsAPI.getById(id);
      console.log("response:", response);
      setProduct(response.data);
      setTransactions(response.data.transactions || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load product');
      console.error('Load product error:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkOut = async (id, data) => {
    try {
      setLoading(true);
      setError(null);
      await productsAPI.checkOut(id, data);
      await loadProduct(id);
      return true;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to check out product');
      console.error('Checkout error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const checkIn = async (id, data) => {
    try {
      setLoading(true);
      setError(null);
      await productsAPI.checkInExisting(id, data);
      await loadProduct(id);
      return true;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to check in product');
      console.error('Check-in error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (id) => {
    try {
      setLoading(true);
      setError(null);
      await productsAPI.delete(id);
      return true;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete product');
      console.error('Delete error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const loadQRCode = async (id) => {
    try {
      const response = await productsAPI.getQRCode(id);
      return response.data.qrCode;
    } catch (err) {
      console.error('Failed to load QR code:', err);
      return null;
    }
  };

  const value = {
    product,
    transactions,
    loading,
    error,
    loadProduct,
    checkOut,
    checkIn,
    deleteProduct,
    loadQRCode
  };

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
}
