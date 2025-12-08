import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { GET_CUSTOMERS } from '../lib/graphql/queries';
import { formatMoney } from '../lib/utils/helpers';
import styles from '../styles/pages.module.css';

export default function EstimateForm({ initialData, onSubmit, onCancel, submitLabel = 'Create Estimate' }) {
  const { data: customersData } = useQuery(GET_CUSTOMERS, {
    variables: { sortKey: 'name' }
  });
  const customers = customersData?.customers || [];

  const [formData, setFormData] = useState({
    customer_id: initialData?.customer_id || '',
    title: initialData?.title || '',
    description: initialData?.description || '',
    notes: initialData?.notes || '',
    status: initialData?.status || 'draft'
  });

  const [lineItems, setLineItems] = useState(initialData?.line_items || [
    { description: '', quantity: 1, rate: 0, amount: 0 }
  ]);

  const [tax, setTax] = useState(initialData?.tax || 0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLineItemChange = (index, field, value) => {
    const newLineItems = [...lineItems];
    newLineItems[index][field] = value;

    // Auto-calculate amount when quantity or rate changes
    if (field === 'quantity' || field === 'rate') {
      const qty = parseFloat(newLineItems[index].quantity) || 0;
      const rate = parseFloat(newLineItems[index].rate) || 0;
      newLineItems[index].amount = (qty * rate).toFixed(2);
    }

    setLineItems(newLineItems);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, rate: 0, amount: 0 }]);
  };

  const removeLineItem = (index) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + (parseFloat(tax) || 0);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const subtotal = calculateSubtotal();
    const total = calculateTotal();

    const submitData = {
      ...formData,
      line_items: lineItems.map(item => ({
        description: item.description,
        quantity: parseFloat(item.quantity),
        rate: parseFloat(item.rate),
        amount: parseFloat(item.amount)
      })),
      subtotal,
      tax: parseFloat(tax),
      total
    };

    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formSection}>
        <h3 className={styles.formSectionTitle}>Customer Information</h3>

        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="customer_id">
            Customer *
          </label>
          <select
            id="customer_id"
            name="customer_id"
            className={styles.formSelect}
            value={formData.customer_id}
            onChange={handleChange}
            required
          >
            <option value="">Select a customer</option>
            {customers.map(customer => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.formSection}>
        <h3 className={styles.formSectionTitle}>Estimate Details</h3>

        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="title">
            Title *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            className={styles.formInput}
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g., Interior Painting - 1302 Redwood Court"
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            className={styles.formTextarea}
            value={formData.description}
            onChange={handleChange}
            rows={3}
            placeholder="Brief description of the work to be done"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="status">
            Status
          </label>
          <select
            id="status"
            name="status"
            className={styles.formSelect}
            value={formData.status}
            onChange={handleChange}
          >
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className={styles.formSection}>
        <h3 className={styles.formSectionTitle}>Line Items</h3>

        {lineItems.map((item, index) => (
          <div key={index} className={styles.lineItemRow}>
            <div className={styles.formGroup} style={{ flex: 2 }}>
              <label className={styles.formLabel}>
                Description {index === 0 && '*'}
              </label>
              <input
                type="text"
                className={styles.formInput}
                value={item.description}
                onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                placeholder="Item description"
                required
              />
            </div>

            <div className={styles.formGroup} style={{ flex: 0.5 }}>
              <label className={styles.formLabel}>Quantity</label>
              <input
                type="number"
                className={styles.formInput}
                value={item.quantity}
                onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                min="0"
                step="0.01"
                required
              />
            </div>

            <div className={styles.formGroup} style={{ flex: 0.5 }}>
              <label className={styles.formLabel}>Rate</label>
              <input
                type="number"
                className={styles.formInput}
                value={item.rate}
                onChange={(e) => handleLineItemChange(index, 'rate', e.target.value)}
                min="0"
                step="0.01"
                required
              />
            </div>

            <div className={styles.formGroup} style={{ flex: 0.5 }}>
              <label className={styles.formLabel}>Amount</label>
              <input
                type="number"
                className={styles.formInput}
                value={item.amount}
                readOnly
                disabled
              />
            </div>

            <div className={styles.formGroup} style={{ flex: 0.2 }}>
              <label className={styles.formLabel}>Delete</label>
              <button
                type="button"
                onClick={() => removeLineItem(index)}
                className={styles.formInputButton}
                disabled={lineItems.length === 1}
                aria-label="Delete line item"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}

        <button type="button" onClick={addLineItem} className="btn-secondary-sm">
          + Add Line Item
        </button>

        <div className={styles.estimateTotals}>
          <div className={styles.totalRow}>
            <span>Subtotal:</span>
            <span>{formatMoney(calculateSubtotal())}</span>
          </div>

          <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
            <label className={styles.formLabel} htmlFor="tax">
              Tax Amount
            </label>
            <input
              type="number"
              id="tax"
              className={styles.formInput}
              value={tax}
              onChange={(e) => setTax(e.target.value)}
              min="0"
              step="0.01"
              placeholder="0.00"
            />
          </div>

          <div className={styles.totalRow} style={{ fontWeight: 'bold', fontSize: '1.2rem', marginTop: '1rem' }}>
            <span>Total:</span>
            <span>{formatMoney(calculateTotal())}</span>
          </div>
        </div>
      </div>

      <div className={styles.formSection}>
        <h3 className={styles.formSectionTitle}>Additional Information</h3>

        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="notes">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            className={styles.formTextarea}
            value={formData.notes}
            onChange={handleChange}
            rows={4}
            placeholder="Terms, conditions, or additional notes"
          />
        </div>
      </div>

      <div className={styles.formActions}>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
        )}
        <button type="submit" className="btn-primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
