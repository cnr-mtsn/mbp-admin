import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation } from '@apollo/client';
import { GET_CUSTOMERS } from '../../lib/graphql/queries';
import { gql } from '@apollo/client';
import { formatMoney } from '../../lib/utils/helpers';
import styles from '../../styles/pages.module.css';
import paymentStyles from '../../styles/payments.module.css';
import cardStyles from '../../styles/cardItems.module.css';
import BackButton from '../../components/ui/BackButton';
import Loading from '../../components/ui/Loading';

const RECORD_PAYMENT = gql`
  mutation RecordPayment($input: RecordPaymentInput!) {
    recordPayment(input: $input) {
      id
      total_amount
      payment_date
    }
  }
`;

const GET_CUSTOMER_UNPAID_INVOICES = gql`
  query GetCustomerUnpaidInvoices($id: ID!) {
    customer(id: $id) {
      id
      name
      invoices(first: 100) {
        id
        title
        total
        status
        due_date
      }
    }
  }
`;

export default function RecordPayment() {
  const router = useRouter();
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('check');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedInvoices, setSelectedInvoices] = useState({});
  const [distributionAmounts, setDistributionAmounts] = useState({});

  const { data: customersData } = useQuery(GET_CUSTOMERS, {
    variables: { sortKey: 'name' }
  });

  const { data: customerData, loading: invoicesLoading } = useQuery(GET_CUSTOMER_UNPAID_INVOICES, {
    variables: { id: selectedCustomer },
    skip: !selectedCustomer,
  });

  const [recordPayment, { loading: submitting }] = useMutation(RECORD_PAYMENT, {
    onCompleted: () => {
      router.push('/invoices');
    },
    refetchQueries: ['GetDashboardAnalytics', 'GetInvoices'],
  });

  const customers = customersData?.customers || [];
  const unpaidInvoices = customerData?.customer?.invoices?.filter(
    inv => inv.status === 'sent' || inv.status === 'unpaid' || inv.status === 'overdue'
  ) || [];

  // Calculate total distributed amount
  const totalDistributed = Object.entries(distributionAmounts).reduce((sum, [id, amount]) => {
    return sum + (parseFloat(amount) || 0);
  }, 0);

  // Calculate remaining balance to distribute
  const remainingBalance = (parseFloat(paymentAmount) || 0) - totalDistributed;

  const handleInvoiceToggle = (invoiceId, invoiceTotal) => {
    const newSelected = { ...selectedInvoices };
    const newDistributions = { ...distributionAmounts };

    if (newSelected[invoiceId]) {
      delete newSelected[invoiceId];
      delete newDistributions[invoiceId];
    } else {
      newSelected[invoiceId] = true;
      // Auto-fill with the lesser of invoice total or remaining balance
      const currentRemaining = (parseFloat(paymentAmount) || 0) - Object.values(newDistributions).reduce((sum, amt) => sum + (parseFloat(amt) || 0), 0);
      newDistributions[invoiceId] = Math.min(invoiceTotal, Math.max(0, currentRemaining));
    }

    setSelectedInvoices(newSelected);
    setDistributionAmounts(newDistributions);
  };

  const handleAmountChange = (invoiceId, value) => {
    setDistributionAmounts({
      ...distributionAmounts,
      [invoiceId]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const invoiceInputs = Object.entries(selectedInvoices)
      .filter(([_, isSelected]) => isSelected)
      .map(([invoiceId]) => ({
        invoice_id: invoiceId,
        amount_applied: parseFloat(distributionAmounts[invoiceId])
      }));

    if (invoiceInputs.length === 0) {
      alert('Please select at least one invoice');
      return;
    }

    try {
      await recordPayment({
        variables: {
          input: {
            customer_id: selectedCustomer,
            payment_method: paymentMethod,
            total_amount: parseFloat(paymentAmount),
            payment_date: paymentDate,
            notes,
            invoices: invoiceInputs
          }
        }
      });
    } catch (error) {
      alert('Error recording payment: ' + error.message);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderContent}>
          <p className={styles.pageLabel}>Payments</p>
          <h2 className={styles.pageTitle}>Record Payment</h2>
        </div>
        <BackButton href="/invoices" classes="btn-secondary" />
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Payment Amount Section */}
        <div className={paymentStyles.paymentAmountSection}>
          <label className={paymentStyles.paymentAmountLabel}>Payment Amount Received</label>
          <input
            type="number"
            step="0.01"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            className={paymentStyles.paymentAmountInput}
            placeholder="$0.00"
            required
          />
          {paymentAmount && (
            <div className={`${paymentStyles.remainingBalance} ${
              remainingBalance > 0 ? paymentStyles.remainingBalancePositive :
              remainingBalance === 0 ? paymentStyles.remainingBalanceZero :
              paymentStyles.remainingBalanceNegative
            }`}>
              {remainingBalance > 0 && `$${remainingBalance.toFixed(2)} remaining to distribute`}
              {remainingBalance === 0 && 'Payment fully distributed'}
              {remainingBalance < 0 && `Over-distributed by $${Math.abs(remainingBalance).toFixed(2)}`}
            </div>
          )}
        </div>

        {/* Payment Details Section */}
        <div className={styles.formSection}>
          <h3 className={styles.formSectionTitle}>Payment Details</h3>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Customer *</label>
              <select
                value={selectedCustomer}
                onChange={(e) => {
                  setSelectedCustomer(e.target.value);
                  setSelectedInvoices({});
                  setDistributionAmounts({});
                }}
                className={styles.formSelect}
                required
              >
                <option value="">Select a customer...</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Payment Method *</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className={styles.formSelect}
                required
              >
                <option value="check">Check</option>
                <option value="cash">Cash</option>
                <option value="credit_card">Credit Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Payment Date *</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className={styles.formInput}
              required
            />
          </div>
        </div>

        {/* Invoice Distribution Section */}
        {selectedCustomer && (
          <div className={styles.formSection}>
            <h3 className={styles.formSectionTitle}>Distribute to Invoices</h3>
              {invoicesLoading ? (
                <div className={paymentStyles.loadingContainer}>
                  <Loading />
                </div>
            ) : unpaidInvoices.length === 0 ? (
              <div className={`card ${paymentStyles.emptyState}`}>
                <p className={paymentStyles.emptyStateText}>
                  No unpaid invoices for this customer
                </p>
              </div>
            ) : (
              <div className={paymentStyles.invoiceList}>
                {unpaidInvoices.map((invoice, index) => (
                  <div
                    key={invoice.id}
                    className={`${paymentStyles.invoiceItem} ${selectedInvoices[invoice.id] ? paymentStyles.invoiceItemSelected : ''}`}
                  >
                    <div className={paymentStyles.invoiceItemContent}>
                      <input
                        type="checkbox"
                        checked={selectedInvoices[invoice.id] || false}
                        onChange={() => handleInvoiceToggle(invoice.id, invoice.total)}
                        className={paymentStyles.invoiceCheckbox}
                      />
                      <div className={paymentStyles.invoiceInfo}>
                        <p className={paymentStyles.invoiceTitle}>
                          {invoice.title}
                        </p>
                        <p className={paymentStyles.invoiceTotal}>
                          Total: {formatMoney(invoice.total)}
                        </p>
                      </div>
                      {selectedInvoices[invoice.id] && (
                        <div className={paymentStyles.amountInputContainer}>
                          <label className={paymentStyles.amountInputLabel}>
                            Amount to apply
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={distributionAmounts[invoice.id] || ''}
                            onChange={(e) => handleAmountChange(invoice.id, e.target.value)}
                            className={styles.formInput}
                            max={invoice.total}
                            required
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notes Section */}
        <div className={styles.formSection}>
          <h3 className={styles.formSectionTitle}>Additional Information</h3>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={styles.formTextarea}
              rows={3}
              placeholder="Add any notes about this payment..."
            />
          </div>
        </div>

          {/* Submit Button */}
          <div className={paymentStyles.submitSection}>
            <button
              type="submit"
              className={`btn-primary ${paymentStyles.submitButton}`}
              disabled={submitting || Object.keys(selectedInvoices).length === 0 || remainingBalance !== 0}
            >
              {submitting ? 'Recording Payment...' : 'Record Payment'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className={`btn-secondary ${paymentStyles.cancelButton}`}
              disabled={submitting}
            >
              Cancel
            </button>
          </div>
      </form>
    </div>
  );
}
