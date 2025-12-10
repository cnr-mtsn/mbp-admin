import { useState, useRef, useEffect } from 'react';
import { useQuery, useLazyQuery } from '@apollo/client';
import { GET_CUSTOMERS, SEARCH_SERVICES } from '../lib/graphql/queries';
import { formatMoney } from '../lib/utils/helpers';
import styles from '../styles/pages.module.css';
import Icon from './ui/Icon'

const WHITE_OAKS_SERVICE_NAME = 'White Oaks Painting';
const MIKE_PARKER_NAME = 'Mike Parker';
const MIKE_PARKER_HOUSES = [
  { name: 'Farm House', size: 1185 },
  { name: 'Jaime', size: 1266 },
  { name: 'Craftsman', size: 1356 },
  { name: 'Crandell', size: 1265 },
  { name: 'Hillside', size: 1047 },
  { name: 'Aspen', size: 1209 },
  { name: 'Country Cottage', size: 1196 },
  { name: 'Wood Ford', size: 1199 },
  { name: 'Isaiah', size: 1811 }
];

export default function InvoiceForm({ initialData, jobId, onSubmit, onCancel, submitLabel = 'Create Invoice' }) {
  const { data: customersData } = useQuery(GET_CUSTOMERS, {
    variables: { sortKey: 'name' }
  });
  const customers = customersData?.customers || [];

  const [formData, setFormData] = useState({
    customer_id: initialData?.customer_id || '',
    job_id: jobId || initialData?.job_id || '',
    title: initialData?.title || '',
    description: initialData?.description || '',
    payment_stage: initialData?.payment_stage || '',
    percentage: initialData?.percentage || '',
    due_date: initialData?.due_date || '',
    notes: initialData?.notes || '',
    status: initialData?.status || 'unpaid'
  });

  const [lineItems, setLineItems] = useState(initialData?.line_items || [
    { name: '', description: '', quantity: 1, rate: 0, amount: 0 }
  ]);

  const [tax, setTax] = useState(initialData?.tax || 0);
  const [searchServices, { data: servicesData }] = useLazyQuery(SEARCH_SERVICES);
  const [activeSearchIndex, setActiveSearchIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState({});
  const dropdownRef = useRef(null);
  const [selectedHouseType, setSelectedHouseType] = useState('');
  const [whiteOaksAutoAdded, setWhiteOaksAutoAdded] = useState(false);

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
    setLineItems([...lineItems, { name: '', description: '', quantity: 1, rate: 0, amount: 0 }]);
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

  const mikeParkerCustomer = customers.find(customer => customer.name === MIKE_PARKER_NAME);
  const isMikeParker = !!mikeParkerCustomer && formData.customer_id === mikeParkerCustomer.id;

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

    const serviceSearch = searchServices({ variables: { search: WHITE_OAKS_SERVICE_NAME } });
    if (serviceSearch?.then) {
      serviceSearch.then(result => {
        const match = result?.data?.services?.find(service => service.name === WHITE_OAKS_SERVICE_NAME);
        if (match?.cost !== undefined) {
          upsertWhiteOaksLineItem(selected.size, match.cost);
        }
      }).catch(() => {
        // Ignore errors; line item already added
      });
    }
  };

  useEffect(() => {
    if (!isMikeParker && whiteOaksAutoAdded) {
      removeAutoWhiteOaksLineItem();
      setSelectedHouseType('');
    }
  }, [isMikeParker, whiteOaksAutoAdded]);

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
        // Combine name and description for backend compatibility
        description: item.name + (item.description ? ` - ${item.description}` : ''),
        quantity: parseFloat(item.quantity),
        rate: parseFloat(item.rate),
        amount: parseFloat(item.amount)
      })),
      subtotal,
      tax: parseFloat(tax),
      total,
      percentage: formData.percentage ? parseInt(formData.percentage) : null
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
            disabled={!!jobId}
          >
            <option value="">Select a customer</option>
            {customers.map(customer => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
          {jobId && (
            <p className={styles.formHint}>Customer is set from the job</p>
          )}
        </div>
      </div>

      <div className={styles.formSection}>
        <h3 className={styles.formSectionTitle}>Invoice Details</h3>

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
            placeholder="e.g., Final Payment - 1302 Redwood Court"
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
            placeholder="Brief description of this invoice"
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

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="payment_stage">
              Payment Stage
            </label>
            <select
              id="payment_stage"
              name="payment_stage"
              className={styles.formSelect}
              value={formData.payment_stage}
              onChange={handleChange}
            >
              <option value="">Select stage</option>
              <option value="start">Start</option>
              <option value="completion">Completion</option>
              <option value="touchup">Touchup</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="percentage">
              Percentage
            </label>
            <input
              type="number"
              id="percentage"
              name="percentage"
              className={styles.formInput}
              value={formData.percentage}
              onChange={handleChange}
              min="0"
              max="100"
              placeholder="e.g., 10"
            />
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="due_date">
              Due Date
            </label>
            <input
              type="date"
              id="due_date"
              name="due_date"
              className={styles.formInput}
              value={formData.due_date}
              onChange={handleChange}
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
              <option value="unpaid">Unpaid</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>
      </div>

      <div className={styles.formSection}>
        <h3 className={styles.formSectionTitle}>Line Items</h3>

        {lineItems.map((item, index) => (
          <div key={index} style={{ marginBottom: '1.5rem' }}>
            <div className={styles.lineItemRow}>
              <div className={`${styles.formGroup} ${styles.lineItemName}`}>
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
              <div className={`${styles.formGroup} ${styles.lineItemDescription}`}>
                <label className={styles.formLabel}>Description</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={item.description}
                  onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                  placeholder="Optional description"
                />
              </div>
              <div className={`${styles.formGroup} ${styles.lineItemQuantity}`}>
                <label className={styles.formLabel}>Quantity</label>
                <input
                  type="number"
                  className={styles.formInput}
                  value={item.quantity}
                  onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                  min="0.1"
                  step="0.1"
                  required
                />
              </div>

              <div className={`${styles.formGroup} ${styles.lineItemRate}`}>
                <label className={styles.formLabel}>Rate</label>
                <input
                  type="number"
                  className={styles.formInput}
                  value={item.rate}
                  onChange={(e) => handleLineItemChange(index, 'rate', e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  required
                />
              </div>

              <div className={`${styles.formGroup} ${styles.lineItemAmount}`}>
                <label className={styles.formLabel}>Amount</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={formatMoney(item.amount)}
                  readOnly
                  disabled
                />
              </div>

              <div className={`${styles.formGroup} ${styles.lineItemDelete}`}>
                <label className={styles.formLabel}>Delete</label>
                <button
                  type="button"
                  onClick={() => removeLineItem(index)}
                  className={styles.formInputButton}
                  disabled={lineItems.length === 1}
                  aria-label="Delete line item"
                >
                  <Icon name="delete" />
                </button>
              </div>
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
            placeholder="Payment terms or additional notes"
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
