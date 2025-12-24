import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useQuery, useMutation } from '@apollo/client';
import { GET_PAYMENT, GET_JOB, GET_INVOICE, GET_INVOICES } from '../../lib/graphql/queries';
import { UPDATE_PAYMENT, DELETE_PAYMENT } from '../../lib/graphql/mutations';
import { toGid, extractUuid } from '../../lib/utils/gid';
import { formatCustomerName, formatDate, formatMoney } from '../../lib/utils/helpers';
import styles from '../../styles/pages.module.css';
import cardStyles from '../../styles/cardItems.module.css';
import paymentStyles from '../../styles/payments.module.css';
import BackButton from '../../components/ui/BackButton';
import Loading from '../../components/ui/Loading';
import Icon from '../../components/ui/Icon'

const PAYMENT_METHOD_OPTIONS = [
  { value: 'check', label: 'Check' },
  { value: 'cash', label: 'Cash' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'other', label: 'Other' },
];

const formatDateForInput = (date) => {
  if (!date) return '';
  const isNumeric = typeof date === 'number' || (typeof date === 'string' && /^\d+$/.test(date));
  const parsed = new Date(isNumeric ? parseInt(date, 10) : date);
  if (isNaN(parsed.getTime())) return '';
  return parsed.toISOString().split('T')[0];
};

export default function PaymentDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [isEditing, setIsEditing] = useState(false);
  const [formState, setFormState] = useState({
    payment_method: 'check',
    payment_date: '',
    notes: '',
  });

  const { data, loading, error, refetch } = useQuery(GET_PAYMENT, {
    variables: { id: id ? toGid('Payment', id) : null },
    skip: !id,
  });

  const [updatePayment, { loading: updating }] = useMutation(UPDATE_PAYMENT, {
    onCompleted: () => {
      setIsEditing(false);
      refetch();
    },
  });

  const [deletePayment, { loading: deleting }] = useMutation(DELETE_PAYMENT);

  const payment = data?.payment;

  useEffect(() => {
    if (payment) {
      setFormState({
        payment_method: payment.payment_method || 'check',
        payment_date: formatDateForInput(payment.payment_date),
        notes: payment.notes || '',
      });
    }
  }, [payment]);

  const handleUpdate = async (event) => {
    event.preventDefault();
    if (!id) return;

    try {
      await updatePayment({
        variables: {
          id: toGid('Payment', id),
          input: formState,
        },
        refetchQueries: () => {
          const invoiceIds = (payment?.invoices || [])
            .map(link => link.invoice?.id)
            .filter(Boolean);
          const jobIds = (payment?.invoices || [])
            .map(link => link.invoice?.job_id)
            .filter(Boolean);

          return [
            ...invoiceIds.map(invoiceId => ({
              query: GET_INVOICE,
              variables: { id: invoiceId },
            })),
            ...jobIds.map(jobId => ({
              query: GET_JOB,
              variables: { id: jobId, sortKey: 'invoice_number' },
            })),
          ];
        },
      });
    } catch (err) {
      alert(`Failed to update payment: ${err.message}`);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!window.confirm('Delete this payment? This will reopen any invoices that were marked paid by it.')) {
      return;
    }

    const invoiceIds = (payment?.invoices || [])
      .map(link => link.invoice?.id)
      .filter(Boolean);
    const jobIds = (payment?.invoices || [])
      .map(link => link.invoice?.job_id)
      .filter(Boolean);

    try {
      await deletePayment({
        variables: { id: toGid('Payment', id) },
        refetchQueries: () => ([
          ...invoiceIds.map(invoiceId => ({
            query: GET_INVOICE,
            variables: { id: invoiceId },
          })),
          ...jobIds.map(jobId => ({
            query: GET_JOB,
            variables: { id: jobId, sortKey: 'invoice_number' },
          })),
          { query: GET_INVOICES },
        ]),
      });
      router.push('/invoices');
    } catch (err) {
      alert(`Failed to delete payment: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className={styles.centerState}>
        <div className={styles.stateContent}>
          <Loading />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.centerState}>
        <div className={styles.stateContent}>
          <h1 className={styles.stateTitleError}>Error loading payment</h1>
          <p className={styles.stateMessage}>{error.message}</p>
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className={styles.centerState}>
        <div className={styles.stateContent}>
          <h1 className={styles.stateTitle}>Payment not found</h1>
        </div>
      </div>
    );
  }

  const appliedTotal = (payment.invoices || []).reduce((sum, invoiceLink) => {
    return sum + (parseFloat(invoiceLink.amount_applied) || 0);
  }, 0);
  const paymentDateLabel = payment.payment_date ? formatDate(payment.payment_date) : '—';
  const displayCustomerName = formatCustomerName(payment.customer, 'Customer Payment');

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeaderLarge}>
        <div className={styles.pageHeaderContent}>
          <p className={styles.pageLabel}>Payment</p>
          <div className={cardStyles.itemHeader}>
            <h2 className={styles.pageTitle}>{displayCustomerName}</h2>
          </div>
          <p className={styles.pageSubtitle}>
            {formatMoney(appliedTotal || payment.total_amount || 0)} &middot; {paymentDateLabel}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            {!isEditing && (
              <button onClick={() => setIsEditing(true)} className="btn-secondary" title="Edit Payment">
                <Icon name="edit" size={10} />
              </button>
            )}
            <button onClick={handleDelete} className="btn-secondary" disabled={deleting} title="Delete Payment">
              <Icon name="trash" size={10} />
            </button>
            <BackButton href="/invoices" classes="btn-secondary" title="Back to Invoices" />
          </div>
        </div>
      </div>

      <div className={styles.detailGrid}>
        <div className={`card ${cardStyles.detailSection}`}>
          <div className={cardStyles.itemHeader}>
            <div className={cardStyles.itemHeaderContent}>
              <h3 className={cardStyles.detailSectionTitle}>Payment Details</h3>
              <p className={cardStyles.itemDescription}>Method, date, and notes</p>
            </div>
          </div>

          <form onSubmit={handleUpdate} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Payment Method</label>
                <select
                  value={formState.payment_method}
                  onChange={(e) => setFormState(prev => ({ ...prev, payment_method: e.target.value }))}
                  className={styles.formSelect}
                  disabled={!isEditing}
                >
                  {PAYMENT_METHOD_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Payment Date</label>
                <input
                  type="date"
                  value={formState.payment_date}
                  onChange={(e) => setFormState(prev => ({ ...prev, payment_date: e.target.value }))}
                  className={styles.formInput}
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Notes</label>
              <textarea
                value={formState.notes}
                onChange={(e) => setFormState(prev => ({ ...prev, notes: e.target.value }))}
                className={styles.formTextarea}
                rows={3}
                placeholder="Add any notes about this payment"
                disabled={!isEditing}
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Amount Received</label>
                <p className={`${paymentStyles.paymentAmount} ${styles.noMargin}`}>
                  {formatMoney(payment.total_amount || 0)}
                </p>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Customer</label>
                {payment.customer ? (
                  <Link href={`/customers/${extractUuid(payment.customer.id)}`} className={cardStyles.detailLink}>
                    {formatCustomerName(payment.customer)}
                  </Link>
                ) : (
                  <span className={cardStyles.detailValue}>—</span>
                )}
              </div>
            </div>

            {isEditing && (
              <div className={paymentStyles.submitSection}>
                <button type="submit" className="btn-primary" disabled={updating}>
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setIsEditing(false);
                    setFormState({
                      payment_method: payment.payment_method || 'check',
                      payment_date: formatDateForInput(payment.payment_date),
                      notes: payment.notes || '',
                    });
                  }}
                  disabled={updating}
                >
                  Cancel
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      <div className={`card ${cardStyles.detailSection} ${styles.sectionCard}`}>
        <div className={cardStyles.itemHeader}>
          <div className={cardStyles.itemHeaderContent}>
            <h3 className={cardStyles.detailSectionTitle}>Applied Invoices</h3>
            <p className={cardStyles.itemDescription}>Amounts applied to each invoice</p>
          </div>
        </div>

        <div className={paymentStyles.paymentInvoices}>
          {(payment.invoices || []).map(link => (
            <div key={link.id} className={paymentStyles.paymentInvoiceRow}>
              <div>
                <p className={paymentStyles.paymentInvoiceTitle}>
                  {link.invoice?.id ? (
                    <Link href={`/invoices/${extractUuid(link.invoice.id)}`}>
                      {link.invoice.invoice_number ? `Invoice ${link.invoice.invoice_number}` : link.invoice.title || 'Invoice'}
                    </Link>
                  ) : (
                    link.invoice?.title || 'Invoice'
                  )}
                </p>
                {link.invoice?.job && link.invoice.job.id && (
                  <p className={paymentStyles.paymentMeta}>
                    Job: <Link href={`/jobs/${extractUuid(link.invoice.job.id)}`}>{link.invoice.job.title}</Link>
                  </p>
                )}
              </div>
              <span className={paymentStyles.paymentInvoiceAmount}>
                {formatMoney(link.amount_applied || 0)}
              </span>
            </div>
          ))}

          {(payment.invoices || []).length === 0 && (
            <p className={paymentStyles.emptyMessage}>No invoices linked to this payment.</p>
          )}
        </div>
      </div>
    </div>
  );
}
