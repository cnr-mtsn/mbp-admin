import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { GET_JOBS } from '../../lib/graphql/queries';
import { formatMoney } from '../../lib/utils/helpers';
import styles from '../../styles/pages.module.css';

export default function ExpenseForm({ initialData, onSubmit, onCancel, submitLabel = 'Create Expense' }) {
  const { data: jobsData } = useQuery(GET_JOBS, {
    variables: { first: 100 }
  });
  const jobs = jobsData?.jobs || [];

  const [formData, setFormData] = useState({
    job_id: initialData?.job_id || '',
    expense_type: initialData?.expense_type || 'labor',
    vendor: initialData?.vendor || '',
    invoice_number: initialData?.invoice_number || '',
    invoice_date: initialData?.invoice_date || '',
    description: initialData?.description || '',
    total: initialData?.total || '',
    notes: initialData?.notes || '',
    status: initialData?.status || 'pending_review'
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.expense_type) {
      newErrors.expense_type = 'Expense type is required';
    }

    if (!formData.total || parseFloat(formData.total) <= 0) {
      newErrors.total = 'Total must be greater than 0';
    }

    if (formData.expense_type === 'materials' && !formData.vendor) {
      newErrors.vendor = 'Vendor is required for material expenses';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const submitData = {
      ...formData,
      total: parseFloat(formData.total),
    };

    // Remove empty fields
    Object.keys(submitData).forEach(key => {
      if (submitData[key] === '' || submitData[key] === null) {
        delete submitData[key];
      }
    });

    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label htmlFor="expense_type" className={styles.formLabel}>
            Expense Type <span style={{ color: 'var(--color-danger)' }}>*</span>
          </label>
          <select
            id="expense_type"
            name="expense_type"
            value={formData.expense_type}
            onChange={handleChange}
            className={styles.formInput}
            required
          >
            <option value="materials">Materials</option>
            <option value="labor">Labor</option>
          </select>
          {errors.expense_type && <span className={styles.formError}>{errors.expense_type}</span>}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="job_id" className={styles.formLabel}>
            Job (Optional)
          </label>
          <select
            id="job_id"
            name="job_id"
            value={formData.job_id}
            onChange={handleChange}
            className={styles.formInput}
          >
            <option value="">No job assigned</option>
            {jobs.map(job => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label htmlFor="vendor" className={styles.formLabel}>
            Vendor {formData.expense_type === 'materials' && <span style={{ color: 'var(--color-danger)' }}>*</span>}
          </label>
          <input
            type="text"
            id="vendor"
            name="vendor"
            value={formData.vendor}
            onChange={handleChange}
            className={styles.formInput}
            placeholder="e.g., Spectrum Paint, ABC Hardware"
          />
          {errors.vendor && <span className={styles.formError}>{errors.vendor}</span>}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="invoice_number" className={styles.formLabel}>
            Invoice Number
          </label>
          <input
            type="text"
            id="invoice_number"
            name="invoice_number"
            value={formData.invoice_number}
            onChange={handleChange}
            className={styles.formInput}
            placeholder="e.g., INV-12345"
          />
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label htmlFor="invoice_date" className={styles.formLabel}>
            Invoice Date
          </label>
          <input
            type="date"
            id="invoice_date"
            name="invoice_date"
            value={formData.invoice_date}
            onChange={handleChange}
            className={styles.formInput}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="total" className={styles.formLabel}>
            Total <span style={{ color: 'var(--color-danger)' }}>*</span>
          </label>
          <input
            type="number"
            id="total"
            name="total"
            value={formData.total}
            onChange={handleChange}
            className={styles.formInput}
            placeholder="0.00"
            step="0.01"
            min="0"
            required
          />
          {errors.total && <span className={styles.formError}>{errors.total}</span>}
        </div>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="description" className={styles.formLabel}>
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          className={styles.formInput}
          rows="3"
          placeholder="Brief description of the expense"
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="notes" className={styles.formLabel}>
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          className={styles.formInput}
          rows="3"
          placeholder="Additional notes (internal use)"
        />
      </div>

      <div className={styles.formActions}>
        <button type="submit" className="btn-primary">
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
