import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useQuery, useMutation } from '@apollo/client';
import { GET_INVOICE } from '../../lib/graphql/queries';
import { UPDATE_INVOICE, SEND_INVOICE } from '../../lib/graphql/mutations';
import { extractUuid, toGid } from '../../lib/utils/gid';
import { formatDate, formatMoney } from '../../lib/utils/helpers';
import InvoiceForm from '../../components/InvoiceForm';
import styles from '../../styles/pages.module.css';
import cardStyles from '../../styles/cardItems.module.css';
import BackButton from '../../components/ui/BackButton'
import Loading from '../../components/ui/Loading'
import Icon from '../../components/ui/Icon'
import PaymentList from '../../components/payments/PaymentList'

const statusStyles = {
  paid: styles.statusPaid,
  sent: styles.statusSent,
  overdue: styles.statusOverdue,
  draft: styles.statusDraft,
};

const INVOICE_STATUSES = ['draft', 'sent', 'paid', 'overdue'];

export default function InvoiceDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [showEditModal, setShowEditModal] = useState(false);
  const dialogRef = useRef(null);

  const { data, loading, error, refetch } = useQuery(GET_INVOICE, {
    variables: { id: id ? toGid('Invoice', id) : null },
    skip: !id,
  });

  const [updateInvoice, { loading: updating, error: updateError }] = useMutation(UPDATE_INVOICE, {
    refetchQueries: [{ query: GET_INVOICE, variables: { id: toGid('Invoice', id) } }],
    onCompleted: () => {
      setShowEditModal(false);
      refetch();
    },
  });

  const [sendInvoice, { loading: sendingInvoice }] = useMutation(SEND_INVOICE);

  // Handle dialog open/close
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (showEditModal) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [showEditModal]);

  const handleStatusChange = async (newStatus) => {
    try {
      await updateInvoice({
        variables: {
          id: toGid('Invoice', id),
          input: { status: newStatus },
        },
      });
    } catch (err) {
      console.error('Error updating invoice status:', err);
      alert('Failed to update invoice status');
    }
  };

  const handleUpdateInvoice = (formData) => {
    // Remove customer_id and job_id from update - these shouldn't change after creation
    const { customer_id, job_id, ...restData } = formData;

    // Build input with only the fields that should be updated
    // This allows partial updates
    const input = {};

    // Only include fields that are present and have values
    if (restData.title !== undefined) input.title = restData.title;
    if (restData.description !== undefined) input.description = restData.description;
    if (restData.payment_stage !== undefined) input.payment_stage = restData.payment_stage;
    if (restData.percentage !== undefined && restData.percentage !== null) input.percentage = restData.percentage;
    if (restData.notes !== undefined) input.notes = restData.notes;
    if (restData.status !== undefined) input.status = restData.status;
    if (restData.line_items !== undefined) input.line_items = restData.line_items;
    if (restData.subtotal !== undefined) input.subtotal = restData.subtotal;
    if (restData.tax !== undefined) input.tax = restData.tax;
    if (restData.total !== undefined) input.total = restData.total;

    // Handle due_date: only include if it's a valid date string (YYYY-MM-DD format)
    if (restData.due_date && restData.due_date !== '') {
      input.due_date = restData.due_date;
    }

    updateInvoice({
      variables: {
        id: toGid('Invoice', id),
        input
      }
    });
  };

  const handleSendInvoice = async () => {
    if (!id) return;

    try {
      await sendInvoice({
        variables: { id: toGid('Invoice', id) },
      });

      alert('Invoice sent successfully!');

      // Update status to 'sent' if it was 'draft'
      if (invoice.status === 'draft') {
        await handleStatusChange('sent');
      } else {
        await refetch();
      }
    } catch (err) {
      console.error('Error sending invoice:', err);
      alert(`Failed to send invoice: ${err.message}`);
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
          <h1 className={styles.stateTitleError}>Error loading invoice</h1>
          <p className={styles.stateMessage}>{error.message}</p>
        </div>
      </div>
    );
  }

  const invoice = data?.invoice;

  if (!invoice) {
    return (
      <div className={styles.centerState}>
        <div className={styles.stateContent}>
          <h1 className={styles.stateTitle}>Invoice not found</h1>
        </div>
      </div>
    );
  }

  const statusClass = statusStyles[invoice.status] || statusStyles.draft;

  // Helper function to convert date to YYYY-MM-DD format for input[type=date]
  const formatDateForInput = (date) => {
    if (!date) return '';
    const d = new Date(parseInt(date));
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  };

  console.log("Invoice Data:", invoice);
  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeaderLarge}>
        <div className={styles.pageHeaderContent}>
          <p className={styles.pageLabel}>Invoice</p>
          <div className={cardStyles.itemHeader}>
            <h2 className={styles.pageTitle}>{invoice.title}</h2>
          </div>
          {invoice.description && <p className={styles.pageSubtitle}>{invoice.description}</p>}
        </div>
        <div className="flex flex-col items-end gap-4 h-full justify-between">
          <span className={`pill ${statusClass} mt-4`}>{invoice.status}</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {invoice.status !== 'paid' && (
              <Link href="/payments/new" className="btn-secondary" title="Record Payment">
                <Icon name="money" size={10} />
              </Link>
            )}
            <button
              onClick={handleSendInvoice}
              className="btn-secondary"
              disabled={sendingInvoice}
              title="Send Invoice"
            >
              <Icon name="send" size={10} />
            </button>
            <button onClick={() => setShowEditModal(true)} className="btn-secondary" title="Edit Invoice">
              <Icon name="edit" size={10} />
            </button>
            <BackButton href="/invoices" classes="btn-secondary" title="Back to Invoices" />
          </div>
        </div>
      </div>

      <div className={styles.detailGrid}>
        <div className={`card ${cardStyles.detailSection}`}>
          <h3 className={cardStyles.detailSectionTitle}>Invoice Information</h3>
          <dl className={cardStyles.detailList}>
            {invoice.invoice_number && (
              <div className={cardStyles.detailItem}>
                <dt className={cardStyles.detailLabel}>Invoice Number</dt>
                <dd className={cardStyles.detailValue}>{invoice.invoice_number}</dd>
              </div>
            )}
            <div className={cardStyles.detailItem}>
              <dt className={cardStyles.detailLabel}>Status</dt>
              <dd className={cardStyles.detailValue}>
                <select
                  value={invoice.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className={styles.statusSelect}
                >
                  {INVOICE_STATUSES.map((status) => (
                    <option 
                      key={status} 
                      value={status}
                      className="uppercase"
                    >
                      {status}
                    </option>
                  ))}
                </select>
              </dd>
            </div>
            {invoice.payment_stage && (
              <div className={cardStyles.detailItem}>
                <dt className={cardStyles.detailLabel}>Payment Stage</dt>
                <dd className={cardStyles.detailValue}>
                  {invoice.payment_stage} {invoice.percentage && `(${invoice.percentage}%)`}
                </dd>
              </div>
            )}
            <div className={cardStyles.detailItem}>
              <dt className={cardStyles.detailLabel}>Due Date</dt>
              <dd className={cardStyles.detailValue}>{invoice.due_date ? formatDate(invoice.due_date) : '—'}</dd>
            </div>
            {invoice.paid_date && (
              <div className={cardStyles.detailItem}>
                <dt className={cardStyles.detailLabel}>Paid Date</dt>
                <dd className={cardStyles.detailValue}>{formatDate(invoice.paid_date)}</dd>
              </div>
            )}
            {invoice.payment_method && (
              <div className={cardStyles.detailItem}>
                <dt className={cardStyles.detailLabel}>Payment Method</dt>
                <dd className={cardStyles.detailValue}>{invoice.payment_method}</dd>
              </div>
            )}
            <div className={cardStyles.detailItem}>
              <dt className={cardStyles.detailLabel}>Created</dt>
              <dd className={cardStyles.detailValue}>{formatDate(invoice.created_at)}</dd>
            </div>
          </dl>
        </div>

        <div className={`card ${cardStyles.detailSection}`}>
          <h3 className={cardStyles.detailSectionTitle}>Customer Information</h3>
          <dl className={cardStyles.detailList}>
            <div className={cardStyles.detailItem}>
              <dt className={cardStyles.detailLabel}>Name</dt>
              <dd className={cardStyles.detailValue}>{invoice.customer?.name}</dd>
            </div>
            <div className={cardStyles.detailItem}>
              <dt className={cardStyles.detailLabel}>Email</dt>
              <dd className={cardStyles.detailLink}>{invoice.customer?.email}</dd>
            </div>
            <div className={cardStyles.detailItem}>
              <dt className={cardStyles.detailLabel}>Phone</dt>
              <dd className={cardStyles.detailLink}>{invoice.customer?.phone}</dd>
            </div>
            <div className={cardStyles.detailItem}>
              <dt className={cardStyles.detailLabel}>Address</dt>
              <dd className={cardStyles.detailValue}>{invoice.customer?.address || '—'}</dd>
            </div>
          </dl>
        </div>

        {invoice.job && (
          <div className={`card ${cardStyles.detailSection}`}>
            <h3 className={cardStyles.detailSectionTitle}>Related Job</h3>
            <dl className={cardStyles.detailList}>
              <div className={cardStyles.detailItem}>
                <dt className={cardStyles.detailLabel}>Job Title</dt>
                <dd className={cardStyles.detailLink}>
                  <Link href={`/jobs/${extractUuid(invoice.job_id)}`}>
                    {invoice.job.title}
                  </Link>
                </dd>
              </div>
            </dl>
          </div>
        )}

        {invoice.estimate && (
          <div className={`card ${cardStyles.detailSection}`}>
            <h3 className={cardStyles.detailSectionTitle}>Related Estimate</h3>
            <dl className={cardStyles.detailList}>
              <div className={cardStyles.detailItem}>
                <dt className={cardStyles.detailLabel}>Estimate Title</dt>
                <dd className={cardStyles.detailLink}>
                  <Link href={`/estimates/${extractUuid(invoice.estimate_id)}`}>
                    {invoice.estimate.title}
                  </Link>
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>

      <div className={`card ${cardStyles.detailSection}`} style={{ marginTop: '2rem' }}>
        <div className={cardStyles.itemHeader}>
          <div className={cardStyles.itemHeaderContent}>
            <h3 className={cardStyles.detailSectionTitle}>Payments</h3>
            <p className={cardStyles.itemDescription}>Payments applied to this invoice</p>
          </div>
        </div>
        <PaymentList
          payments={invoice.payments || []}
          emptyMessage="No payments recorded for this invoice."
        />
      </div>

      {invoice.line_items && invoice.line_items.length > 0 && (
        <div className={`card ${cardStyles.detailSection}`} style={{ marginTop: '2rem' }}>
          <div className={cardStyles.itemHeader}>
            <h3 className={cardStyles.detailSectionTitle}>Line Items</h3>
          </div>

          <div className={cardStyles.lineItems}>
            {invoice.line_items.map((item, index) => (
              <div key={`${item.description}-${index}`} className={cardStyles.lineItem}>
                <div className={cardStyles.lineItemHeader}>
                  <div>
                    <p className={cardStyles.lineItemDescription}>{item.description}</p>
                    <p className={cardStyles.lineItemDetails}>Qty {item.quantity} @ {formatMoney(item.rate || 0)}</p>
                  </div>
                  <p className={cardStyles.lineItemAmount}>{formatMoney(item.amount || 0)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className={cardStyles.totalsSection}>
            <div className={cardStyles.totalRow}>
              <span className={cardStyles.totalLabel}>Subtotal:</span>
              <span className={cardStyles.totalValue}>{formatMoney(invoice.subtotal || 0)}</span>
            </div>
            <div className={cardStyles.totalRow}>
              <span className={cardStyles.totalLabel}>Tax:</span>
              <span className={cardStyles.totalValue}>{formatMoney(invoice.tax || 0)}</span>
            </div>
            <div className={cardStyles.totalRowFinal}>
              <span className={cardStyles.totalLabelFinal}>Total:</span>
              <span className={cardStyles.totalValueFinal}>{formatMoney(invoice.total || 0)}</span>
            </div>
          </div>
        </div>
      )}

      {invoice.notes && (
        <div className={`card ${cardStyles.detailSection}`} style={{ marginTop: '2rem' }}>
          <h3 className={cardStyles.detailSectionTitle}>Notes</h3>
          <p className={cardStyles.detailValue} style={{ whiteSpace: 'pre-line' }}>{invoice.notes}</p>
        </div>
      )}

      {/* Edit Invoice Dialog */}
      <dialog
        ref={dialogRef}
        onClick={(e) => {
          // Close dialog when clicking on the backdrop (outside the form)
          if (e.target === dialogRef.current) {
            setShowEditModal(false);
          }
        }}
        onClose={() => setShowEditModal(false)}
        className={styles.invoiceDialog}
      >
        <div className={`card ${styles.dialogContent}`}>
          <h3 className={cardStyles.detailSectionTitle}>Edit Invoice</h3>

          {updateError && (
            <div style={{
              padding: '1rem',
              marginBottom: '1rem',
              backgroundColor: 'var(--status-overdue-bg)',
              color: 'var(--status-overdue-text)',
              borderRadius: '0.5rem'
            }}>
              Error: {updateError.message}
            </div>
          )}

          <InvoiceForm
            initialData={{
              customer_id: invoice.customer_id || '',
              job_id: invoice.job_id || '',
              title: invoice.title,
              description: invoice.description,
              payment_stage: invoice.payment_stage,
              percentage: invoice.percentage,
              due_date: formatDateForInput(invoice.due_date),
              notes: invoice.notes,
              status: invoice.status,
              line_items: invoice.line_items?.map(item => {
                // Parse the combined description back into name and description
                const parts = item.description?.split(' - ') || [''];
                return {
                  name: parts[0] || '',
                  description: parts.slice(1).join(' - ') || '',
                  quantity: item.quantity,
                  rate: item.rate,
                  amount: item.amount
                };
              }) || [],
              tax: invoice.tax
            }}
            onSubmit={handleUpdateInvoice}
            onCancel={() => setShowEditModal(false)}
            submitLabel={updating ? 'Updating...' : 'Update Invoice'}
          />
        </div>
      </dialog>

      <style jsx>{`
        dialog::backdrop {
          background-color: rgba(0, 0, 0, 0.5);
        }
      `}</style>
    </div>
  );
}
