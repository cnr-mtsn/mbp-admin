import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useQuery, useMutation } from '@apollo/client';
import { GET_ESTIMATE } from '../../lib/graphql/queries';
import { ACCEPT_ESTIMATE, UPDATE_ESTIMATE, DELETE_ESTIMATE, SEND_ESTIMATE } from '../../lib/graphql/mutations';
import { formatCustomerName, formatDate, formatMoney, formatStatus } from '../../lib/utils/helpers';
import { extractUuid, toGid } from '../../lib/utils/gid';
import EstimateForm from '../../components/EstimateForm';
import EmailPreviewModal from '../../components/EmailPreviewModal';
import ActivityTimeline from '../../components/ActivityTimeline';
import styles from '../../styles/pages.module.css';
import cardStyles from '../../styles/cardItems.module.css';
import BackButton from '../../components/ui/BackButton';
import Loading from '../../components/ui/Loading';
import Icon from '../../components/ui/Icon';
import Alert from '../../components/ui/Alert';

const statusStyles = {
  accepted: styles.statusAccepted,
  rejected: styles.statusRejected,
  sent: styles.statusSent,
  draft: styles.statusDraft,
};

const PAYMENT_SCHEDULES = [
  { value: '50/40/10', label: '50/40/10 (Start/Completion/Touchup)' },
  { value: '50/50', label: '50/50 (Start/Completion)' },
  { value: '100', label: '100% (Due on Completion)' }
];

export default function EstimateDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [alert, setAlert] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [paymentSchedule, setPaymentSchedule] = useState('50/40/10');
  const [customSchedule, setCustomSchedule] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const dialogRef = useRef(null);
  const deleteDialogRef = useRef(null);

  const { data, loading, error, refetch } = useQuery(GET_ESTIMATE, {
    variables: { id: id ? toGid('Estimate', id) : null },
    skip: !id,
  });

  const [acceptEstimate, { loading: accepting, error: acceptError }] = useMutation(ACCEPT_ESTIMATE, {
    onCompleted: (data) => {
      const jobId = extractUuid(data.acceptEstimate.id);
      router.push(`/jobs/${jobId}`);
    },
  });

  const [updateEstimate, { loading: updating, error: updateError }] = useMutation(UPDATE_ESTIMATE, {
    refetchQueries: [{ query: GET_ESTIMATE, variables: { id: toGid('Estimate', id) } }],
    onCompleted: () => {
      setShowEditModal(false);
      refetch();
    },
  });

  const [sendEstimate, { loading: sendingEstimate }] = useMutation(SEND_ESTIMATE);

  const [deleteEstimate] = useMutation(DELETE_ESTIMATE);

  // Handle dialog open/close for edit modal
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (showEditModal) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [showEditModal]);

  // Handle dialog open/close for delete modal
  useEffect(() => {
    const dialog = deleteDialogRef.current;
    if (!dialog) return;

    if (showDeleteModal) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [showDeleteModal]);

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
          <h1 className={styles.stateTitleError}>Error loading estimate</h1>
          <p className={styles.stateMessage}>{error.message}</p>
        </div>
      </div>
    );
  }

  const estimate = data?.estimate;

  if (!estimate) {
    return (
      <div className={styles.centerState}>
        <div className={styles.stateContent}>
          <h1 className={styles.stateTitle}>Estimate not found</h1>
        </div>
      </div>
    );
  }

  const statusClass = statusStyles[estimate.status] || statusStyles.draft;

  const handleAccept = () => {
    const schedule = isCustom ? customSchedule : paymentSchedule;
    acceptEstimate({
      variables: {
        id: estimate.id,
        payment_schedule: schedule
      }
    });
  };

  const handleUpdateEstimate = (formData) => {
    // Remove customer_id from update - this shouldn't change after creation
    const { customer_id, ...restData } = formData;

    // Build input with only the fields that should be updated
    const input = {};

    // Only include fields that are present and have values
    if (restData.title !== undefined) input.title = restData.title;
    if (restData.description !== undefined) input.description = restData.description;
    if (restData.notes !== undefined) input.notes = restData.notes;
    if (restData.status !== undefined) input.status = restData.status;
    if (restData.line_items !== undefined) input.line_items = restData.line_items;
    if (restData.subtotal !== undefined) input.subtotal = restData.subtotal;
    if (restData.tax !== undefined) input.tax = restData.tax;
    if (restData.total !== undefined) input.total = restData.total;

    updateEstimate({
      variables: {
        id: toGid('Estimate', id),
        input
      }
    });
  };

  const handleSendEstimate = async () => {
    // Open the email preview modal instead of sending directly
    setShowEmailPreview(true);
  };

  const handleConfirmSend = async (emailOptions) => {
    if (!id) return false;

    try {
      await sendEstimate({
        variables: {
          id: toGid('Estimate', id),
          recipientEmail: emailOptions.recipientEmail,
          ccEmails: emailOptions.ccEmails,
          subject: emailOptions.subject,
          body: emailOptions.body,
        },
      });

      setAlert({
        isOpen: true,
        title: 'Success',
        message: 'Estimate sent successfully!',
        type: 'success'
      });

      // Refetch to update status if it changed from draft to sent
      await refetch();

      return true;
    } catch (err) {
      console.error('Error sending estimate:', err);
      setAlert({
        isOpen: true,
        title: 'Error',
        message: `Failed to send estimate: ${err.message}`,
        type: 'error'
      });
      return false;
    }
  };

  const handleDelete = async () => {
    try {
      await deleteEstimate({
        variables: { id: toGid('Estimate', id) },
      });
      router.push('/estimates');
    } catch (err) {
      console.error('Error deleting estimate:', err);
      setShowDeleteModal(false);
      setAlert({
        isOpen: true,
        title: 'Error',
        message: err.message || 'Failed to delete estimate',
        type: 'error'
      });
    }
  };

  // Helper function to convert date to YYYY-MM-DD format for input[type=date]
  const formatDateForInput = (date) => {
    if (!date) return '';
    const d = new Date(parseInt(date));
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeaderLarge}>
        <div className={styles.pageHeaderContent}>
          <p className={styles.pageLabel}>Estimate</p>
          <div className={cardStyles.itemHeader}>
            <h2 className={styles.pageTitle}>{estimate.title}</h2>
          </div>
          {estimate.description && <p className={styles.pageSubtitle}>{estimate.description}</p>}
        </div>
        <div className="flex flex-col items-end gap-4 h-full justify-between">
          <span className={`pill ${statusClass} mt-4`}>{formatStatus(estimate.status)}</span>
          <div className="flex gap-2">
            {estimate.status !== 'accepted' && (
              <button onClick={() => setShowAcceptModal(true)} className="btn-primary">
                Accept & Create Job
              </button>
            )}
            <button
              onClick={handleSendEstimate}
              className="btn-secondary"
              disabled={sendingEstimate}
              title="Send Estimate"
            >
              <Icon name="send" size={10} />
            </button>
            <button onClick={() => setShowEditModal(true)} className="btn-secondary" title="Edit Estimate">
              <Icon name="edit" size={10} />
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className={`btn-secondary ${styles.btnDanger}`}
              title="Delete Estimate"
            >
              <Icon name="trash" size={10} />
            </button>
            <BackButton href="/estimates" classes="btn-secondary" title="Back to Estimates" />
          </div>
        </div>
      </div>

      <div className={styles.detailGrid}>
        <div className={`card ${cardStyles.detailSection}`}>
          <h3 className={cardStyles.detailSectionTitle}>Estimate Information</h3>
          <dl className={cardStyles.detailList}>
            <div className={cardStyles.detailItem}>
              <dt className={cardStyles.detailLabel}>Status</dt>
              <dd className={cardStyles.detailValue}>
                <span className={`pill ${statusClass}`}>{formatStatus(estimate.status)}</span>
              </dd>
            </div>
            <div className={cardStyles.detailItem}>
              <dt className={cardStyles.detailLabel}>Created</dt>
              <dd className={cardStyles.detailValue}>{formatDate(estimate.created_at)}</dd>
            </div>
            {estimate.updated_at && (
              <div className={cardStyles.detailItem}>
                <dt className={cardStyles.detailLabel}>Last Updated</dt>
                <dd className={cardStyles.detailValue}>{formatDate(estimate.updated_at)}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className={`card ${cardStyles.detailSection}`}>
          <h3 className={cardStyles.detailSectionTitle}>Customer Information</h3>
          <dl className={cardStyles.detailList}>
            <div className={cardStyles.detailItem}>
              <dt className={cardStyles.detailLabel}>Name</dt>
              <dd className={cardStyles.detailValue}>{formatCustomerName(estimate.customer)}</dd>
            </div>
            <div className={cardStyles.detailItem}>
              <dt className={cardStyles.detailLabel}>Email</dt>
              <dd className={cardStyles.detailLink}>{estimate.customer?.email}</dd>
            </div>
            <div className={cardStyles.detailItem}>
              <dt className={cardStyles.detailLabel}>Phone</dt>
              <dd className={cardStyles.detailLink}>{estimate.customer?.phone}</dd>
            </div>
            <div className={cardStyles.detailItem}>
              <dt className={cardStyles.detailLabel}>Address</dt>
              <dd className={cardStyles.detailValue}>{estimate.customer?.address || '—'}</dd>
            </div>
          </dl>
        </div>
      </div>

      {estimate.line_items && estimate.line_items.length > 0 && (
        <div className={`card ${cardStyles.detailSection} ${styles.sectionCard}`}>
          <div className={cardStyles.itemHeader}>
            <h3 className={cardStyles.detailSectionTitle}>Line Items</h3>
          </div>

          <div className={cardStyles.lineItems}>
            {estimate.line_items.map((item, index) => (
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
              <span className={cardStyles.totalValue}>{formatMoney(estimate.subtotal || 0)}</span>
            </div>
            <div className={cardStyles.totalRow}>
              <span className={cardStyles.totalLabel}>Tax:</span>
              <span className={cardStyles.totalValue}>{formatMoney(estimate.tax || 0)}</span>
            </div>
            <div className={cardStyles.totalRowFinal}>
              <span className={cardStyles.totalLabelFinal}>Total:</span>
              <span className={cardStyles.totalValueFinal}>{formatMoney(estimate.total || 0)}</span>
            </div>
          </div>
        </div>
      )}

      {estimate.notes && (
        <div className={`card ${cardStyles.detailSection} ${styles.sectionCard}`}>
          <h3 className={cardStyles.detailSectionTitle}>Notes</h3>
          <p className={`${cardStyles.detailValue} ${styles.whitespacePreLine}`}>{estimate.notes}</p>
        </div>
      )}

      {/* Activity Timeline */}
      {estimate.activity_logs && (
        <ActivityTimeline activities={estimate.activity_logs} />
      )}

      {/* Edit Estimate Dialog */}
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
          <h3 className={styles.modalHeader}>Edit Estimate</h3>
          <button onClick={() => setShowEditModal(false)} className={styles.modalClose}>
            <Icon name="close" size={10} />
          </button>
          {updateError && (
            <div className={styles.alertError}>
              Error: {updateError.message}
            </div>
          )}

          <EstimateForm
            initialData={{
              customer_id: estimate.customer_id || '',
              title: estimate.title,
              description: estimate.description,
              notes: estimate.notes,
              status: estimate.status,
              line_items: estimate.line_items?.map(item => {
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
              tax: estimate.tax
            }}
            onSubmit={handleUpdateEstimate}
            onCancel={() => setShowEditModal(false)}
            submitLabel={updating ? 'Updating...' : 'Update Estimate'}
          />
        </div>
      </dialog>

      {/* Email Preview Modal */}
      <EmailPreviewModal
        estimate={estimate}
        type="estimate"
        isOpen={showEmailPreview}
        onClose={() => setShowEmailPreview(false)}
        onSend={handleConfirmSend}
      />

      {/* Custom Alert Dialog */}
      <Alert
        isOpen={alert.isOpen}
        onClose={() => setAlert({ ...alert, isOpen: false })}
        title={alert.title}
        message={alert.message}
        type={alert.type}
      />

      {/* Delete Confirmation Dialog */}
      <dialog ref={deleteDialogRef} className={styles.modal}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h3>Delete Estimate</h3>
            <button onClick={() => setShowDeleteModal(false)} className={styles.modalClose}>
              <Icon name="close" size={10} />
            </button>
          </div>
          <div className={styles.modalBody}>
            <p>Are you sure you want to delete this estimate?</p>
            <p className={`${styles.textMuted} mt-2`}>
              This action cannot be undone.
            </p>
            <div className="flex gap-2 mt-6">
              <button onClick={handleDelete} className={`btn-primary ${styles.btnDangerBg}`}>
                Delete
              </button>
              <button onClick={() => setShowDeleteModal(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </dialog>

      {/* Accept Estimate Modal */}
      {showAcceptModal && (
        <div className={styles.modalOverlay}>
          <div className={`card ${styles.modalContent} ${styles.modalContentNarrow}`}>
            <h3 className={cardStyles.detailSectionTitle}>Accept Estimate & Create Job</h3>
            <p className={styles.modalDescription}>
              This will create a new job from this estimate and generate invoices based on the selected payment schedule.
            </p>

            {acceptError && (
              <div className={styles.alertError}>
                Error: {acceptError.message}
              </div>
            )}

            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="payment_schedule">
                Payment Schedule *
              </label>
              <select
                id="payment_schedule"
                className={styles.formSelect}
                value={isCustom ? 'custom' : paymentSchedule}
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    setIsCustom(true);
                  } else {
                    setIsCustom(false);
                    setPaymentSchedule(e.target.value);
                  }
                }}
              >
                {PAYMENT_SCHEDULES.map(schedule => (
                  <option key={schedule.value} value={schedule.value}>
                    {schedule.label}
                  </option>
                ))}
                <option value="custom">Custom</option>
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
                  onChange={(e) => setCustomSchedule(e.target.value)}
                  placeholder="e.g., 60/30/10 or 33/33/34"
                />
                <p className={styles.formHint}>
                  Enter percentages separated by slashes. Must add up to 100%.
                </p>
              </div>
            )}

            <div className={styles.modalFooter}>
              <button
                onClick={() => setShowAcceptModal(false)}
                className="btn-secondary"
                disabled={accepting}
              >
                Cancel
              </button>
              <button
                onClick={handleAccept}
                className="btn-primary"
                disabled={accepting || (isCustom && !customSchedule)}
              >
                {accepting ? 'Creating Job...' : 'Accept & Create Job'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        dialog::backdrop {
          background-color: rgba(0, 0, 0, 0.5);
        }
      `}</style>
    </div>
  );
}
