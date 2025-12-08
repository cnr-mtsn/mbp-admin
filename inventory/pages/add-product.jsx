import { useState } from 'react';
import { useRouter } from 'next/router';
import { productsAPI } from '../api/client';
import { getFullName } from '../utils/helpers';
import PRODUCT_TYPES, { getInitialAttributes } from '../utils/productTypes';
import useAuthStore from '../store/authStore';
import { Card, CardBody, Alert, Button, FormGroup, FormLabel, FormInput, FormSelect, FormHelper } from '../components/ui';
import FillLevelPicker from '../components/FillLevelPicker';
import styles from '../styles/add-product.module.css';

export default function AddProduct() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [qrCode, setQrCode] = useState(null);

  const [formData, setFormData] = useState({
    product_type: 'paint',
    attributes: getInitialAttributes('paint'),
    employee_name: getFullName(user),
  });

  const handleProductTypeChange = (e) => {
    const nextType = e.target.value;
    setFormData((prev) => ({
      ...prev,
      product_type: nextType,
      attributes: getInitialAttributes(nextType),
    }));
  };

  const handleAttributeChange = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [key]: value,
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    setQrCode(null);

    try {
      const response = await productsAPI.checkIn(formData);
      setSuccess('Product added successfully!');

      if (response.data.qrCode) {
        setQrCode(response.data.qrCode);
      }

      setTimeout(() => {
        if (response.data.product?.id) {
          router.push(`/product/${response.data.product.id}`);
        } else {
          setFormData({
            product_type: 'paint',
            attributes: getInitialAttributes('paint'),
            employee_name: formData.employee_name,
          });
          setSuccess(null);
          setQrCode(null);
        }
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add product');
      console.error('Add product error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintQR = () => {
    if (!qrCode) return;

    const printWindow = window.open('', '', 'width=400,height=500');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print QR Code</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
            img {
              width: 300px;
              height: 300px;
            }
            @media print {
              body { margin: 0; padding: 10px; }
            }
          </style>
        </head>
        <body>
          <img src="${qrCode}" alt="QR Code" />
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 100);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const productTypeConfig = PRODUCT_TYPES[formData.product_type] || { fields: [] };
  const attributeFields = productTypeConfig.fields || [];

  const renderAttributeInput = (field) => {
    const value = formData.attributes[field.key] ?? '';
    const inputId = `attr-${field.key}`;
    const containerSize = formData.attributes.containerSize;

    if (field.type === 'select') {
      return (
        <FormSelect
          id={inputId}
          name={field.key}
          value={value}
          onChange={(e) => handleAttributeChange(field.key, e.target.value)}
          required={field.required}
        >
          <option value="">Select {field.label.toLowerCase()}</option>
          {field.options?.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </FormSelect>
      );
    }

    if (field.type === 'decimal') {
      if (field.key === 'volume') {
        return (
          <>
            <FillLevelPicker
              containerSize={containerSize}
              value={value}
              onChange={(newValue) => handleAttributeChange(field.key, newValue)}
            />
            <FormInput
              type="number"
              id={inputId}
              name={field.key}
              value={value}
              onChange={(e) => handleAttributeChange(field.key, e.target.value)}
              step="0.01"
              min="0"
              max="1"
              required={field.required}
              placeholder="0.5 = half full"
              className="hidden"
            />
          </>
        );
      }

      return (
        <>
          <FormInput
            type="number"
            id={inputId}
            name={field.key}
            value={value}
            onChange={(e) => handleAttributeChange(field.key, e.target.value)}
            step="0.01"
            min="0"
            max="1"
            required={field.required}
            placeholder="0.5 = half full"
          />
          <FormHelper>Enter a fill level between 0 and 1 (e.g., 1 = full, 0.5 = half).</FormHelper>
        </>
      );
    }

    return (
      <FormInput
        id={inputId}
        name={field.key}
        value={value}
        onChange={(e) => handleAttributeChange(field.key, e.target.value)}
        required={field.required}
      />
    );
  };

  return (
    <div className="page">
      <h1 className="page-title">Add Product</h1>

      <Card>
        <CardBody>
          <form onSubmit={handleSubmit} className={styles.form}>
            <Alert variant="danger">{error}</Alert>
            <Alert variant="success">{success}</Alert>
            
            <FormGroup>
              <FormLabel htmlFor="product_type" required>Product Type</FormLabel>
              <FormSelect
                id="product_type"
                name="product_type"
                value={formData.product_type}
                onChange={handleProductTypeChange}
                required
              >
                {Object.entries(PRODUCT_TYPES).map(([value, config]) => (
                  <option key={value} value={value}>{config.label}</option>
                ))}
              </FormSelect>
            </FormGroup>

            <div className={styles.sizeGrid}>
              {attributeFields.map((field) => (
                <FormGroup key={field.key}>
                  {field.label && (

                    <FormLabel htmlFor={`attr-${field.key}`} required={field.required}>
                      {field.label}
                    </FormLabel>
                  )}
                  {renderAttributeInput(field)}
                </FormGroup>
              ))}
            </div>

            <FormGroup className="hidden">
              <FormLabel htmlFor="employee_name" required>Your Name</FormLabel>
              <FormInput
                id="employee_name"
                name="employee_name"
                value={formData.employee_name}
                onChange={(e) => setFormData({ ...formData, employee_name: e.target.value })}
                readOnly={getFullName(user) !== ""}
                placeholder="Enter your name"
                required
              />
            </FormGroup>

            <div className={styles.formActions}>
              <Button type="submit" disabled={loading} variant="primary">
                {loading ? 'Adding...' : 'Add Product'}
              </Button>
            </div>
          </form>

          {qrCode && (
            <div className={styles.qrSection}>
              <h3 className={styles.qrTitle}>
                QR Code Generated
              </h3>
              <div className="flex flex-col items-center">
                <img
                  src={qrCode}
                  alt="Product QR Code"
                  className={styles.qrCodeImage}
                />
                <Button onClick={handlePrintQR} variant="success" className="mt-md">
                  <svg className={styles.printIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print QR Code Label
                </Button>
                <p className={`mt-sm ${styles.qrHelp}`}>
                  Scan this code to view or check out this product
                </p>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
