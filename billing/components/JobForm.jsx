import { useState, useEffect, useRef } from 'react';
import { useQuery, useLazyQuery } from '@apollo/client';
import { GET_CUSTOMERS, GET_UNLINKED_INVOICES, SEARCH_SERVICES } from '../lib/graphql/queries';
import { formatMoney } from '../lib/utils/helpers';
import styles from '../styles/pages.module.css';

const WHITE_OAKS_SERVICE_NAME = 'White Oaks Painting';
const MIKE_PARKER_NAME = 'Mike Parker';
const MIKE_PARKER_HOUSES = [
  { name: 'Farm House', size: 1185 },
  { name: 'Jaime', size: 1266 },
  { name: 'Craftsman', size: 1356 },
  { name: 'Crandell', size: 1265 },
  { name: 'Hillside', size: 1067 },
  { name: 'Aspen', size: 1209 },
  { name: 'Country Cottage', size: 1196 },
  { name: 'Wood Ford', size: 1199 },
  { name: 'Isaiah', size: 1811 }
];

const PAYMENT_SCHEDULES = [
  { value: '50/40/10', label: '50/40/10 (Start/Completion/Touchup)' },
  { value: '50/50', label: '50/50 (Start/Completion)' },
  { value: '100', label: '100% (Due on Completion)' },
  { value: 'custom', label: 'Custom' }
];

export default function JobForm({ initialData, onSubmit, onCancel, submitLabel = 'Create Job' }) {
  const { data: customersData } = useQuery(GET_CUSTOMERS, {
    variables: { sortKey: 'name' }
  });
  const customers = customersData?.customers || [];

  const { data: unlinkedInvoicesData } = useQuery(GET_UNLINKED_INVOICES);
  const unlinkedInvoices = unlinkedInvoicesData?.unlinkedInvoices || [];

  const [formData, setFormData] = useState({
    customer_id: initialData?.customer_id || '',
    title: initialData?.title || '',
    description: initialData?.description || '',
    address: initialData?.address || '',
    city: initialData?.city || '',
    state: initialData?.state || '',
    zip: initialData?.zip || '',
    payment_schedule: initialData?.payment_schedule || '50/40/10',
    start_date: initialData?.start_date || '',
    notes: initialData?.notes || ''
  });

  const [lineItems, setLineItems] = useState(initialData?.line_items || [
    { name: '', description: '', quantity: 1, rate: 0, amount: 0 }
  ]);

  const [customSchedule, setCustomSchedule] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [invoiceMode, setInvoiceMode] = useState('generate'); // 'generate' or 'select'
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);
  const [selectedHouseType, setSelectedHouseType] = useState('');
  const [whiteOaksAutoAdded, setWhiteOaksAutoAdded] = useState(false);
  const [hasSetMikeSchedule, setHasSetMikeSchedule] = useState(false);

  const [searchServices, { data: servicesData }] = useLazyQuery(SEARCH_SERVICES);
  const [activeSearchIndex, setActiveSearchIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState({});
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (initialData?.payment_schedule &&
        !PAYMENT_SCHEDULES.find(s => s.value === initialData.payment_schedule && s.value !== 'custom')) {
      setIsCustom(true);
      setCustomSchedule(initialData.payment_schedule);
    }
  }, [initialData]);

  const mikeParkerCustomer = customers.find(customer => customer.name === MIKE_PARKER_NAME);
  const isMikeParker = !!mikeParkerCustomer && formData.customer_id === mikeParkerCustomer.id;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePaymentScheduleChange = (e) => {
    const value = e.target.value;
    if (value === 'custom') {
      setIsCustom(true);
      setFormData(prev => ({ ...prev, payment_schedule: customSchedule }));
    } else {
      setIsCustom(false);
      setFormData(prev => ({ ...prev, payment_schedule: value }));
    }
  };

  const handleCustomScheduleChange = (e) => {
    const value = e.target.value;
    setCustomSchedule(value);
    setFormData(prev => ({ ...prev, payment_schedule: value }));
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
    setLineItems([...lineItems, { name: '', description: '', quantity: 1, rate: 0, amount: 0 }]);
  };

  const removeLineItem = (index) => {
    if (lineItems.length > 1) {
      const removedName = lineItems[index]?.name;
      setLineItems(lineItems.filter((_, i) => i !== index));
      if (removedName === WHITE_OAKS_SERVICE_NAME && whiteOaksAutoAdded) {
        setWhiteOaksAutoAdded(false);
        setSelectedHouseType('');
      }
    }
  };

  const handleNameChange = (index, value) => {
    handleLineItemChange(index, 'name', value);
    setSearchQuery(prev => ({ ...prev, [index]: value }));
    setActiveSearchIndex(index);

    // Trigger search if query is not empty
    if (value.trim()) {
      searchServices({ variables: { search: value } });
    }
  };

  const handleServiceSelect = (index, service) => {
    const newLineItems = [...lineItems];
    newLineItems[index].name = service.name;
    newLineItems[index].description = service.description || '';
    newLineItems[index].rate = service.cost;

    // Recalculate amount
    const qty = parseFloat(newLineItems[index].quantity) || 0;
    const rate = parseFloat(service.cost) || 0;
    newLineItems[index].amount = (qty * rate).toFixed(2);

    setLineItems(newLineItems);
    setActiveSearchIndex(null);
    setSearchQuery(prev => ({ ...prev, [index]: '' }));
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveSearchIndex(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const removeAutoWhiteOaksLineItem = () => {
    setLineItems(prev => prev.filter(item => item.name !== WHITE_OAKS_SERVICE_NAME));
    setWhiteOaksAutoAdded(false);
  };

  const upsertWhiteOaksLineItem = (size, serviceCost) => {
    const quantity = parseFloat(size) || 0;
    setLineItems(prev => {
      const existingIndex = prev.findIndex(item => item.name === WHITE_OAKS_SERVICE_NAME);
      const existingRate = existingIndex >= 0 ? prev[existingIndex].rate : 0;
      const rate = existingIndex >= 0
        ? (existingRate || serviceCost || 0)
        : (serviceCost ?? 0);
      const amount = parseFloat((quantity * (parseFloat(rate) || 0)).toFixed(2));
      const updatedItem = {
        ...(existingIndex >= 0 ? prev[existingIndex] : { description: '' }),
        name: WHITE_OAKS_SERVICE_NAME,
        quantity,
        rate,
        amount
      };

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = updatedItem;
        return updated;
      }

      return [updatedItem, ...prev];
    });
    setWhiteOaksAutoAdded(true);
  };

  const handleHouseTypeChange = (e) => {
    const value = e.target.value;
    setSelectedHouseType(value);

    const selected = MIKE_PARKER_HOUSES.find(house => house.name === value);
    if (!selected) {
      if (whiteOaksAutoAdded) {
        removeAutoWhiteOaksLineItem();
      }
      return;
    }

    upsertWhiteOaksLineItem(selected.size);

    // Attempt to load the service rate for White Oaks Painting
    const serviceSearch = searchServices({ variables: { search: WHITE_OAKS_SERVICE_NAME } });
    if (serviceSearch?.then) {
      serviceSearch.then(result => {
        const match = result?.data?.services?.find(service => service.name === WHITE_OAKS_SERVICE_NAME);
        if (match?.cost !== undefined) {
          upsertWhiteOaksLineItem(selected.size, match.cost);
        }
      }).catch(() => {
        // Ignore errors from the lookup; line item already added
      });
    }
  };

  useEffect(() => {
    if (!isMikeParker && whiteOaksAutoAdded) {
      removeAutoWhiteOaksLineItem();
      setSelectedHouseType('');
    }
  }, [isMikeParker, whiteOaksAutoAdded]);

  useEffect(() => {
    if (isMikeParker && !hasSetMikeSchedule) {
      setIsCustom(false);
      setCustomSchedule('');
      setFormData(prev => ({ ...prev, payment_schedule: '50/40/10' }));
      setHasSetMikeSchedule(true);
    } else if (!isMikeParker && hasSetMikeSchedule) {
      setHasSetMikeSchedule(false);
    }
  }, [isMikeParker, hasSetMikeSchedule]);

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  };

  const handleInvoiceToggle = (invoiceId) => {
    setSelectedInvoiceIds(prev => {
      if (prev.includes(invoiceId)) {
        return prev.filter(id => id !== invoiceId);
      } else {
        return [...prev, invoiceId];
      }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const total_amount = calculateSubtotal();

    const submitData = {
      ...formData,
      total_amount,
      line_items: lineItems.map(item => ({
        name: item.name,
        description: item.description,
        quantity: parseFloat(item.quantity),
        rate: parseFloat(item.rate),
        amount: parseFloat(item.amount)
      }))
    };

    // Only include invoice_ids if in 'select' mode and invoices are selected
    if (invoiceMode === 'select' && selectedInvoiceIds.length > 0) {
      submitData.invoice_ids = selectedInvoiceIds;
    }

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
        <h3 className={styles.formSectionTitle}>Job Details</h3>

        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="title">
            Job Title *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            className={styles.formInput}
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g., 1302 Redwood Court"
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
            placeholder="Brief description of the job"
          />
        </div>

        {isMikeParker && (
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="house_type">
              House Type (Mike Parker)
            </label>
            <select
              id="house_type"
              name="house_type"
              className={styles.formSelect}
              value={selectedHouseType}
              onChange={handleHouseTypeChange}
            >
              <option value="">Select house type</option>
              {MIKE_PARKER_HOUSES.map(house => (
                <option key={house.name} value={house.name}>
                  {house.name} ({house.size} sqft)
                </option>
              ))}
            </select>
            <p className={styles.formHint}>
              Selecting a house type will add a "{WHITE_OAKS_SERVICE_NAME}" line item with the square footage as quantity.
            </p>
          </div>
        )}

        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="payment_schedule">
            Payment Schedule *
          </label>
          <select
            id="payment_schedule"
            name="payment_schedule"
            className={styles.formSelect}
            value={isCustom ? 'custom' : formData.payment_schedule}
            onChange={handlePaymentScheduleChange}
            required
          >
            {PAYMENT_SCHEDULES.map(schedule => (
              <option key={schedule.value} value={schedule.value}>
                {schedule.label}
              </option>
            ))}
          </select>
        </div>

        {isCustom && (
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="custom_schedule">
              Custom Schedule (e.g., 60/30/10)
            </label>
            <input
              type="text"
              id="custom_schedule"
              className={styles.formInput}
              value={customSchedule}
              onChange={handleCustomScheduleChange}
              placeholder="e.g., 60/30/10 or 33/33/34"
            />
            <p className={styles.formHint}>
              Enter percentages separated by slashes. Must add up to 100%.
            </p>
          </div>
        )}

        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="start_date">
            Start Date
          </label>
          <input
            type="date"
            id="start_date"
            name="start_date"
            className={styles.formInput}
            value={formData.start_date}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className={styles.formSection}>
        <h3 className={styles.formSectionTitle}>Line Items</h3>

        {lineItems.map((item, index) => (
          <div key={index} style={{ marginBottom: '1.5rem' }}>
            <div className={styles.lineItemRow}>
              <div className={styles.formGroup} style={{ flex: 2, position: 'relative' }}>
                <label className={styles.formLabel}>
                  Name {index === 0 && '*'}
                </label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={item.name}
                  onChange={(e) => handleNameChange(index, e.target.value)}
                  placeholder="Search for service..."
                  required
                />
                {activeSearchIndex === index && servicesData?.services?.length > 0 && (
                  <div
                    ref={dropdownRef}
                    className={styles.servicesDropdown}
                  >
                    {servicesData.services.map((service) => (
                      <div
                        key={service.id}
                        onClick={() => handleServiceSelect(index, service)}
                        className="p-3 cursor-pointer border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {service.name}
                        </div>
                        {service.description && (
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {service.description}
                          </div>
                        )}
                        <div className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                          {formatMoney(service.cost)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Description field below */}
            <div className={styles.formGroup}>
              <input
                type="text"
                className={styles.formInput}
                value={item.description}
                onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                placeholder="Optional description"
              />
            </div>
          </div>
        ))}

        <button type="button" onClick={addLineItem} className="btn-secondary-sm">
          + Add Line Item
        </button>

        <div className={styles.estimateTotals} style={{ marginTop: '1.5rem' }}>
          <div className={styles.totalRow} style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>
            <span>Total:</span>
            <span>{formatMoney(calculateSubtotal())}</span>
          </div>
        </div>
      </div>

      <div className={styles.formSection}>
        <h3 className={styles.formSectionTitle}>Invoice Handling</h3>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            How should invoices be handled?
          </label>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="invoice_mode"
                value="generate"
                checked={invoiceMode === 'generate'}
                onChange={(e) => setInvoiceMode(e.target.value)}
              />
              <span>Generate invoices</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="invoice_mode"
                value="select"
                checked={invoiceMode === 'select'}
                onChange={(e) => setInvoiceMode(e.target.value)}
              />
              <span>Select existing invoices</span>
            </label>
          </div>
        </div>

        {invoiceMode === 'select' && (
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Select Invoices ({unlinkedInvoices.length} available)
            </label>
            {unlinkedInvoices.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.5rem' }}>
                No unlinked invoices available
              </p>
            ) : (
              <div style={{
                border: '1px solid var(--form-border)',
                borderRadius: '0.375rem',
                maxHeight: '300px',
                overflowY: 'auto',
                marginTop: '0.5rem'
              }}>
                {unlinkedInvoices.map((invoice) => (
                  <label
                    key={invoice.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.75rem',
                      borderBottom: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      backgroundColor: selectedInvoiceIds.includes(invoice.id) ? 'var(--secondary-bg)' : 'transparent'
                    }}
                    onMouseEnter={(e) => {
                      if (!selectedInvoiceIds.includes(invoice.id)) {
                        e.currentTarget.style.backgroundColor = 'var(--primary-bg)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!selectedInvoiceIds.includes(invoice.id)) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedInvoiceIds.includes(invoice.id)}
                      onChange={() => handleInvoiceToggle(invoice.id)}
                      style={{ marginRight: '0.75rem' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500' }}>
                        #{invoice.invoice_number} - {invoice.title}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {invoice.customer?.name} • {formatMoney(invoice.total)} • {invoice.status}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
            {selectedInvoiceIds.length > 0 && (
              <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                {selectedInvoiceIds.length} invoice{selectedInvoiceIds.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>
        )}
      </div>

      <div className={styles.formSection}>
        <h3 className={styles.formSectionTitle}>Job Address</h3>

        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="address">
            Street Address
          </label>
          <input
            type="text"
            id="address"
            name="address"
            className={styles.formInput}
            value={formData.address}
            onChange={handleChange}
            placeholder="123 Main St"
          />
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="city">
              City
            </label>
            <input
              type="text"
              id="city"
              name="city"
              className={styles.formInput}
              value={formData.city}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="state">
              State
            </label>
            <input
              type="text"
              id="state"
              name="state"
              className={styles.formInput}
              value={formData.state}
              onChange={handleChange}
              maxLength={2}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="zip">
              ZIP Code
            </label>
            <input
              type="text"
              id="zip"
              name="zip"
              className={styles.formInput}
              value={formData.zip}
              onChange={handleChange}
            />
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
            placeholder="Any additional notes about this job"
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
