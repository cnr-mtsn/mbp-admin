import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useQuery, useMutation } from '@apollo/client';
import { GET_JOB, GET_INVOICES } from '../../lib/graphql/queries';
import { LINK_INVOICES_TO_JOB, CREATE_INVOICE, UPDATE_JOB } from '../../lib/graphql/mutations';
import { toGid, extractUuid } from '../../lib/utils/gid';
import { formatDate, formatMoney } from '../../lib/utils/helpers';
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
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {job.status !== 'paid' && invoices.some(inv => inv.status !== 'paid') && (
            <Link href="/payments/new" className="btn-primary">
              Record Payment
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
              <dd className={cardStyles.detailValue}>{job.customer?.name}</dd>
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
            <p className={cardStyles.detailValue} style={{ whiteSpace: 'pre-line' }}>{job.notes}</p>
          </div>
        )}
      </div>

      <div className={`card ${cardStyles.detailSection}`} style={{ marginTop: '2rem' }}>
        <div className={cardStyles.itemHeader}>
          <div className={cardStyles.itemHeaderContent}>
            <h3 className={cardStyles.detailSectionTitle}>Invoices</h3>
            <p className={cardStyles.itemDescription}>Payment schedule across this job</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
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

      <div className={`card ${cardStyles.detailSection}`} style={{ marginTop: '2rem' }}>
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

      {/* Link Existing Invoices Modal */}
      {showLinkModal && (
        <div className={styles.modalOverlay}>
          <div className={`card ${styles.modalContent} ${styles.modalContentSmall}`}>
            <h3 className={cardStyles.detailSectionTitle}>Link Existing Invoices</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Select invoices to link to this job. Only invoices not already linked to a job are shown.
            </p>

            {linkError && (
              <div style={{
                padding: '1rem',
                marginBottom: '1rem',
                backgroundColor: 'var(--status-overdue-bg)',
                color: 'var(--status-overdue-text)',
                borderRadius: '0.5rem'
              }}>
                Error: {linkError.message}
              </div>
            )}

            {unlinkedInvoices.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', padding: '2rem 0', textAlign: 'center' }}>
                No unlinked invoices available.
              </p>
            ) : (
              <div style={{ marginBottom: '1.5rem' }}>
                {unlinkedInvoices.map(invoice => (
                  <div key={invoice.id} style={{
                    padding: '1rem',
                    marginBottom: '0.5rem',
                    border: '1px solid var(--border-default)',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    backgroundColor: selectedInvoices.includes(invoice.id) ? 'var(--status-sent-bg)' : 'transparent'
                  }}
                  onClick={() => handleToggleInvoice(invoice.id)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <input
                        type="checkbox"
                        checked={selectedInvoices.includes(invoice.id)}
                        onChange={() => handleToggleInvoice(invoice.id)}
                        style={{ cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{invoice.title}</p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                          {invoice.customer?.name} • {formatMoney(invoice.total || 0)} • {invoice.status}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
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
              <div style={{
                padding: '1rem',
                marginBottom: '1rem',
                backgroundColor: 'var(--status-overdue-bg)',
                color: 'var(--status-overdue-text)',
                borderRadius: '0.5rem'
              }}>
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
