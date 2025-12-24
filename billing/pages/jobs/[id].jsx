import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useQuery, useMutation } from '@apollo/client';
import { GET_JOB, GET_INVOICES } from '../../lib/graphql/queries';
import { LINK_INVOICES_TO_JOB, CREATE_INVOICE, UPDATE_JOB } from '../../lib/graphql/mutations';
import { toGid, extractUuid } from '../../lib/utils/gid';
import { formatCustomerName, formatDate, formatMoney, formatStatus } from '../../lib/utils/helpers';
import InvoiceForm from '../../components/InvoiceForm';
import styles from '../../styles/pages.module.css';
import cardStyles from '../../styles/cardItems.module.css';
import InvoiceCard from '../../components/invoice/InvoiceCard'
import InvoicesGrid from '../../components/invoice/InvoicesGrid'
import Icon from '../../components/ui/Icon'
import BackButton from '../../components/ui/BackButton'
import Loading from '../../components/ui/Loading'
import PaymentList from '../../components/payments/PaymentList'

const jobStatusStyles = {
  completed: styles.statusCompleted,
  in_progress: styles.statusInProgress,
  pending: styles.statusPending,
  paid: styles.statusPaid,
};

export default function JobDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState([]);

  const { data, loading, error, refetch } = useQuery(GET_JOB, {
    variables: {
      id: id ? toGid('Job', id) : null,
      sortKey: 'invoice_number'
    },
    skip: !id,
  });

  const { data: invoicesData } = useQuery(GET_INVOICES, {
    skip: !showLinkModal,
  });

  const [linkInvoices, { loading: linking, error: linkError }] = useMutation(LINK_INVOICES_TO_JOB, {
    onCompleted: () => {
      setShowLinkModal(false);
      setSelectedInvoices([]);
      refetch();
    },
  });

  const [createInvoice, { loading: creating, error: createError }] = useMutation(CREATE_INVOICE, {
    onCompleted: () => {
      setShowCreateModal(false);
      refetch();
    },
  });

  const [updateJob, { loading: updating }] = useMutation(UPDATE_JOB, {
    onCompleted: () => {
      refetch();
    },
  });

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
          <h1 className={styles.stateTitleError}>Error loading job</h1>
          <p className={styles.stateMessage}>{error.message}</p>
        </div>
      </div>
    );
  }

  const job = data?.job;

  if (!job) {
    return (
      <div className={styles.centerState}>
        <div className={styles.stateContent}>
          <h1 className={styles.stateTitle}>Job not found</h1>
        </div>
      </div>
    );
  }

  const statusClass = jobStatusStyles[job.status] || jobStatusStyles.pending;
  const invoices = job.invoices || [];
  const locationParts = [job.address, job.city, job.state].filter(Boolean);
  const location = locationParts.length ? `${locationParts.join(', ')}${job.zip ? ` ${job.zip}` : ''}` : '';

  // Filter unlinked invoices for the link modal
  const unlinkedInvoices = (invoicesData?.invoices || []).filter(inv => !inv.job_id);

  const handleLinkInvoices = () => {
    linkInvoices({
      variables: {
        job_id: toGid('Job', id),
        invoice_ids: selectedInvoices
      }
    });
  };

  const handleToggleInvoice = (invoiceId) => {
    setSelectedInvoices(prev =>
      prev.includes(invoiceId)
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId]
    );
  };

  const handleCreateInvoice = (formData) => {
    createInvoice({
      variables: {
        input: {
          ...formData,
          job_id: toGid('Job', id)
        }
      }
    });
  };

  const handleStatusChange = (newStatus) => {
    updateJob({
      variables: {
        id: toGid('Job', id),
        input: {
          status: newStatus,
        }
      }
    });
  };

  return (
    <div className={styles.pageContainer}>
      <div className={`relative ${styles.pageHeaderLarge}`}>
        <div className={styles.pageHeaderContent}>
          <p className={styles.pageLabel}>Job</p>
          <div className={cardStyles.itemHeader}>
            <h2 className={styles.pageTitle}>{job.title}</h2>
            {/* <span className={`pill absolute top-2 right-2 ${statusClass}`}>{job.status}</span> */}
          </div>
          {job.description && <p className={styles.pageSubtitle}>{job.description}</p>}
        </div>
          <div className="flex gap-2">
          {job.status !== 'paid' && invoices.some(inv => inv.status !== 'paid') && (
            <Link href="/payments/new" className="btn-secondary" title="Record Payment">
              <Icon name="money" size={10} />
            </Link>
          )}
          <BackButton href="/jobs" title="Back to Jobs" />
        </div>
      </div>

      <div className={styles.detailGrid}>
        <div className={`card ${cardStyles.detailSection}`}>
          <h3 className={cardStyles.detailSectionTitle}>Job Information</h3>
          <dl className={cardStyles.detailList}>
            <div className={cardStyles.detailItem}>
              <dt className={cardStyles.detailLabel}>Status</dt>
              <dd className={cardStyles.detailValue}>
                <select
                  value={job.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className={styles.statusSelect}
                  disabled={updating}
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="paid">Paid</option>
                </select>
              </dd>
            </div>
            <div className={cardStyles.detailItem}>
              <dt className={cardStyles.detailLabel}>Total Amount</dt>
              <dd className={cardStyles.detailValue}>{formatMoney(job.total_amount || 0)}</dd>
            </div>
            <div className={cardStyles.detailItem}>
              <dt className={cardStyles.detailLabel}>Amount Paid</dt>
              <dd className={cardStyles.detailValue}>{formatMoney(job.amount_paid || 0)}</dd>
            </div>
            <div className={cardStyles.detailItem}>
              <dt className={cardStyles.detailLabel}>Payment Schedule</dt>
              <dd className={cardStyles.detailValue}>{job.payment_schedule || '—'}</dd>
            </div>
            {job.start_date && (
              <div className={cardStyles.detailItem}>
                <dt className={cardStyles.detailLabel}>Start Date</dt>
                <dd className={cardStyles.detailValue}>{formatDate(job.start_date)}</dd>
              </div>
            )}
            {job.completion_date && (
              <div className={cardStyles.detailItem}>
                <dt className={cardStyles.detailLabel}>Completion Date</dt>
                <dd className={cardStyles.detailValue}>{formatDate(job.completion_date)}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className={`card ${cardStyles.detailSection}`}>
          <h3 className={cardStyles.detailSectionTitle}>Customer Information</h3>
          <dl className={cardStyles.detailList}>
            <div className={cardStyles.detailItem}>
              <dt className={cardStyles.detailLabel}>Name</dt>
              <dd className={cardStyles.detailValue}>{formatCustomerName(job.customer)}</dd>
            </div>
            <div className={cardStyles.detailItem}>
              <dt className={cardStyles.detailLabel}>Email</dt>
              <dd className={cardStyles.detailLink}>
                <a href={`mailto:${job.customer?.email}`}>
                  {job.customer?.email}
                </a>
              </dd>
            </div>
            <div className={cardStyles.detailItem}>
              <dt className={cardStyles.detailLabel}>Phone</dt>
              <dd className={cardStyles.detailLink}>
                <a href={`tel:${job.customer?.phone}`}>
                  {job.customer?.phone}
                </a>
              </dd>
            </div>
            <div className={cardStyles.detailItem}>
              <dt className={cardStyles.detailLabel}>Address</dt>
              <dd className={cardStyles.detailValue}>
                {job.customer?.address ? (
                  <>
                    {job.customer.address}
                    <br />
                    {job.customer.city}, {job.customer.state} {job.customer.zip}
                  </>
                ) : (
                  '—'
                )}
              </dd>
            </div>
          </dl>
        </div>

        {location && (
          <div className={`card ${cardStyles.detailSection}`}>
            <h3 className={cardStyles.detailSectionTitle}>Job Address</h3>
            <p className={cardStyles.detailValue}>{location}</p>
          </div>
        )}

        {job.notes && (
          <div className={`card ${cardStyles.detailSection}`}>
            <h3 className={cardStyles.detailSectionTitle}>Notes</h3>
            <p className={`${cardStyles.detailValue} ${styles.whitespacePreLine}`}>{job.notes}</p>
          </div>
        )}
      </div>

      <div className={`card ${cardStyles.detailSection} ${styles.sectionCard}`}>
        <div className={cardStyles.itemHeader}>
          <div className={cardStyles.itemHeaderContent}>
            <h3 className={cardStyles.detailSectionTitle}>Invoices</h3>
            <p className={cardStyles.itemDescription}>Payment schedule across this job</p>
          </div>
          <div className="flex gap-2">
            <button 
              title="Create New Invoice"
              onClick={() => setShowCreateModal(true)} 
              className="btn-primary-sm"
            >
              <Icon name="add" size={10}/>
            </button>
            <button 
              title="Link Existing Invoice(s)"
              onClick={() => setShowLinkModal(true)} 
              className="btn-secondary-sm"
            >
              <Icon name="link" size={10} />
            </button>
          </div>
        </div>

        <InvoicesGrid invoices={invoices} />

      </div>

      <div className={`card ${cardStyles.detailSection} ${styles.sectionCard}`}>
        <div className={cardStyles.itemHeader}>
          <div className={cardStyles.itemHeaderContent}>
            <h3 className={cardStyles.detailSectionTitle}>Payments</h3>
            <p className={cardStyles.itemDescription}>Payments applied to invoices on this job</p>
          </div>
        </div>

          <PaymentList
          payments={job.payments || []}
          emptyMessage="No payments recorded for this job yet."
        />
      </div>

      {/* Expenses Section */}
      <div className="card">
        <div className={cardStyles.detailSection}>
            <div className={cardStyles.itemHeader}>
              <div className={cardStyles.itemHeaderContent}>
                <h3 className={cardStyles.detailSectionTitle}>Expenses</h3>
                <p className={cardStyles.itemDescription}>Material and labor costs for this job</p>
              </div>
              <div className="flex gap-2">
                <Link href={`/expenses/unassigned`} className="btn-secondary-sm" title="Link expense(s) to this job">
                  <Icon name="link" size={10} />
                </Link>
                <Link
                  href={{
                    pathname: '/expenses/new',
                    query: { job_id: id },
                  }}
                  className="btn-primary-sm"
                  title="Create new expense for this job"
                >
                  <Icon name="add" size={10} />
                </Link>
              </div>
            </div>

          {/* Expense Summary */}
          <div className={styles.summaryGrid}>
            <div>
              <p className={styles.summaryLabel}>Total Expenses</p>
              <p className={styles.summaryValueDanger}>
                {formatMoney(job.total_expenses || 0)}
              </p>
            </div>
            <div>
              <p className={styles.summaryLabel}>Total Revenue</p>
              <p className={styles.summaryValue}>
                {formatMoney(job.amount_paid || 0)}
              </p>
            </div>
            <div>
              <p className={styles.summaryLabel}>Net Profit</p>
              <p className={(job.net_profit || 0) >= 0 ? styles.summaryValueProfit : styles.summaryValueLoss}>
                {formatMoney(job.net_profit || 0)}
              </p>
            </div>
          </div>

          {/* Expenses List */}
          {job.expenses && job.expenses.length > 0 ? (
            <div className="mt-6">
              {job.expenses.map(expense => (
                <Link
                  key={expense.id}
                  href={`/expenses/${extractUuid(expense.id)}`}
                  className={styles.listItemCard}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className={styles.listItemTitle}>
                        {expense.vendor || 'Manual Expense'}
                        {expense.invoice_number && ` - #${expense.invoice_number}`}
                      </p>
                      <p className={styles.listItemMeta}>
                        {expense.expense_type === 'labor' ? 'Labor' : 'Materials'}
                        {expense.invoice_date && ` • ${formatDate(expense.invoice_date)}`}
                      </p>
                    </div>
                    <div className={styles.textRight}>
                      <p className={styles.listItemAmount}>
                        {formatMoney(expense.total)}
                      </p>
                      <span className={`pill ${styles.pillSmall} ${expense.status === 'approved' ? styles.statusPaid : styles.statusSent}`}>
                        {formatStatus(expense.status?.replace('_', ' '))}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className={`${styles.textMuted} ${styles.textCenter} py-8`}>
              No expenses recorded for this job yet.
            </p>
          )}
        </div>
      </div>

      {/* Link Existing Invoices Modal */}
      {showLinkModal && (
        <div className={styles.modalOverlay}>
          <div className={`card ${styles.modalContent} ${styles.modalContentSmall}`}>
            <h3 className={cardStyles.detailSectionTitle}>Link Existing Invoices</h3>
            <p className={`${styles.textMuted} mb-6`}>
              Select invoices to link to this job. Only invoices not already linked to a job are shown.
            </p>

            {linkError && (
              <div className={styles.alertError}>
                Error: {linkError.message}
              </div>
            )}

            {unlinkedInvoices.length === 0 ? (
              <p className={`${styles.textMuted} ${styles.textCenter} py-8`}>
                No unlinked invoices available.
              </p>
            ) : (
              <div className="mb-6">
                {unlinkedInvoices.map(invoice => (
                  <div
                    key={invoice.id}
                    className={`${styles.selectableItem} ${selectedInvoices.includes(invoice.id) ? styles.selectableItemSelected : ''}`}
                    onClick={() => handleToggleInvoice(invoice.id)}
                  >
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={selectedInvoices.includes(invoice.id)}
                        onChange={() => handleToggleInvoice(invoice.id)}
                        className="cursor-pointer"
                      />
                      <div className="flex-1">
                        <p className={styles.listItemTitle}>{invoice.title}</p>
                        <p className={styles.listItemMeta}>
                          {formatCustomerName(invoice.customer)} • {formatMoney(invoice.total || 0)} • {formatStatus(invoice.status)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowLinkModal(false);
                  setSelectedInvoices([]);
                }}
                className="btn-secondary"
                disabled={linking}
              >
                Cancel
              </button>
              <button
                onClick={handleLinkInvoices}
                className="btn-primary"
                disabled={linking || selectedInvoices.length === 0}
              >
                {linking ? 'Linking...' : `Link ${selectedInvoices.length} Invoice${selectedInvoices.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Invoice Modal */}
      {showCreateModal && (
        <div className={styles.modalOverlay}>
          <div className={`card ${styles.modalContent} ${styles.modalContentLarge}`}>
            <h3 className={cardStyles.detailSectionTitle}>Create New Invoice for Job</h3>

            {createError && (
              <div className={styles.alertError}>
                Error: {createError.message}
              </div>
            )}

            <InvoiceForm
              jobId={toGid('Job', id)}
              initialData={{ customer_id: job.customer_id }}
              onSubmit={handleCreateInvoice}
              onCancel={() => setShowCreateModal(false)}
              submitLabel={creating ? 'Creating...' : 'Create Invoice'}
            />
          </div>
        </div>
      )}
    </div>
  );
}
