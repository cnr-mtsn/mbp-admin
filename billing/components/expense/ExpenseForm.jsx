import { useEffect, useState, useMemo, useCallback } from 'react';
import { useQuery } from '@apollo/client';
import { GET_JOBS } from '../../lib/graphql/queries';
import { formatCustomerName, formatDate } from '../../lib/utils/helpers';
import SearchableSelect from '../ui/SearchableSelect';
import styles from '../../styles/pages.module.css';

export default function ExpenseForm({ initialData, onSubmit, onCancel, submitLabel = 'Create Expense' }) {
  const defaultLaborRate = process.env.NEXT_PUBLIC_COST_PER_MAN_HOUR || '';

  const deriveLaborQuantity = (total, rate) => {
    const totalNum = parseFloat(total);
    const rateNum = parseFloat(rate);

    if (!Number.isFinite(totalNum) || !Number.isFinite(rateNum) || rateNum <= 0) {
      return '';
    }

    const quantity = totalNum / rateNum;
    return Number.isFinite(quantity) && quantity > 0 ? quantity.toFixed(2) : '';
  };

  const { data: jobsData } = useQuery(GET_JOBS, {
    variables: { first: 100 }
  });
  const jobs = jobsData?.jobs || [];

  // Transform jobs into searchable options
  const jobOptions = useMemo(() => {
    return jobs.map(job => ({
      value: job.id,
      label: job.title,
      secondary: `${formatCustomerName(job.customer, 'No customer')} • ${
        job.start_date ? formatDate(job.start_date) : 'No start date'
      }`,
      job // Keep reference for filtering
    }));
  }, [jobs]);

  // Custom filter to search by job title AND customer name
  const filterJobs = useCallback((option, query) => {
    if (!query) return true;
    const searchLower = query.toLowerCase();
    return (
      option.label?.toLowerCase().includes(searchLower) ||
      option.job?.customer?.name?.toLowerCase().includes(searchLower) ||
      option.job?.customer?.company_name?.toLowerCase().includes(searchLower)
    );
  }, []);

  const initialExpenseType = initialData?.expense_type || 'labor';
  const initialRate = initialExpenseType === 'labor' ? (initialData?.rate || defaultLaborRate) : '';
  const initialTotal = initialData?.total || '';

  const [formData, setFormData] = useState({
    job_id: initialData?.job_id || '',
    expense_type: initialExpenseType,
    vendor: initialData?.vendor || '',
    invoice_number: initialData?.invoice_number || '',
    invoice_date: initialData?.invoice_date || '',
    description: initialData?.description || '',
    total: initialTotal,
    notes: initialData?.notes || '',
    status: initialData?.status || 'pending_review',
    quantity: initialExpenseType === 'labor'
      ? deriveLaborQuantity(initialTotal, initialRate)
      : '',
    rate: initialExpenseType === 'labor' ? initialRate : '',
  });

  const [errors, setErrors] = useState({});

  const jobIdFromInitial = initialData?.job_id;

  useEffect(() => {
    if (jobIdFromInitial && jobIdFromInitial !== formData.job_id) {
      setFormData(prev => ({ ...prev, job_id: jobIdFromInitial }));
    }
  }, [jobIdFromInitial, formData.job_id]);

  useEffect(() => {
    if (formData.expense_type !== 'labor') {
      return;
    }

    const qty = parseFloat(formData.quantity);
    const rate = parseFloat(formData.rate);

    if (!Number.isFinite(qty) || !Number.isFinite(rate) || qty <= 0 || rate <= 0) {
      return;
    }

    const calculatedTotal = (qty * rate).toFixed(2);

    if (calculatedTotal !== formData.total) {
      setFormData(prev => ({ ...prev, total: calculatedTotal }));
    }
  }, [formData.expense_type, formData.quantity, formData.rate, formData.total]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };

      if (name === 'expense_type') {
        if (value === 'labor') {
          updated.vendor = '';
          updated.invoice_number = '';
          updated.notes = '';
          if (!prev.rate) {
            updated.rate = defaultLaborRate;
          }
        }
      }

      return updated;
    });

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

    if (formData.expense_type === 'labor') {
      if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
        newErrors.quantity = 'Hours must be greater than 0';
      }

      if (!formData.rate) {
        newErrors.rate = 'Rate is required for labor expenses';
      } else if (parseFloat(formData.rate) <= 0) {
        newErrors.rate = 'Rate must be greater than 0';
      }
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

    const { quantity, rate, ...submitFields } = formData;

    const submitData = {
      ...submitFields,
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
            Expense Type <span className={styles.requiredIndicator}>*</span>
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
          <SearchableSelect
            id="job_id"
            name="job_id"
            value={formData.job_id}
            onChange={(value) => handleChange({ target: { name: 'job_id', value } })}
            options={[
              { value: '', label: 'No job assigned', secondary: '' },
              ...jobOptions
            ]}
            filterFn={filterJobs}
            placeholder="Search jobs..."
            emptyMessage="No jobs found"
          />
        </div>
      </div>

      {formData.expense_type !== 'labor' && (
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="vendor" className={styles.formLabel}>
              Vendor {formData.expense_type === 'materials' && <span className={styles.requiredIndicator}>*</span>}
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
      )}

      {formData.expense_type === 'labor' && (
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="quantity" className={styles.formLabel}>
              Hours <span className={styles.requiredIndicator}>*</span>
            </label>
            <input
              type="number"
              id="quantity"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              className={styles.formInput}
              placeholder="0"
              step="0.25"
              min="0"
              required={formData.expense_type === 'labor'}
            />
            {errors.quantity && <span className={styles.formError}>{errors.quantity}</span>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="rate" className={styles.formLabel}>
              Rate (per hour) <span className={styles.requiredIndicator}>*</span>
            </label>
            <input
              type="number"
              id="rate"
              name="rate"
              value={formData.rate}
              onChange={handleChange}
              className={styles.formInput}
              placeholder={defaultLaborRate || '0.00'}
              step="0.01"
              min="0"
              required={formData.expense_type === 'labor'}
            />
            {errors.rate && <span className={styles.formError}>{errors.rate}</span>}
          </div>
        </div>
      )}

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
            Total <span className={styles.requiredIndicator}>*</span>
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
            readOnly={formData.expense_type === 'labor'}
            required
          />
          {formData.expense_type === 'labor' && (
            <p className={styles.formHint}>
              Calculated as hours x rate
            </p>
          )}
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

      {formData.expense_type !== 'labor' && (
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
      )}

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
