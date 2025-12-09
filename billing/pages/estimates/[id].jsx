import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useQuery, useMutation } from '@apollo/client';
import { GET_ESTIMATE } from '../../lib/graphql/queries';
import { ACCEPT_ESTIMATE } from '../../lib/graphql/mutations';
import { formatDate, formatMoney } from '../../lib/utils/helpers';
import { extractUuid } from '../../lib/utils/gid';
import styles from '../../styles/pages.module.css';
import cardStyles from '../../styles/cardItems.module.css';
import BackButton from '../../components/ui/BackButton'
import Loading from '../../components/ui/Loading'

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
  const [paymentSchedule, setPaymentSchedule] = useState('50/40/10');
  const [customSchedule, setCustomSchedule] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  const { data, loading, error } = useQuery(GET_ESTIMATE, {
    variables: { id },
    skip: !id,
  });

  const [acceptEstimate, { loading: accepting, error: acceptError }] = useMutation(ACCEPT_ESTIMATE, {
    onCompleted: (data) => {
      const jobId = extractUuid(data.acceptEstimate.id);
      router.push(`/jobs/${jobId}`);
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

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeaderLarge}>
        <div className={styles.pageHeaderContent}>
          <p className={styles.pageLabel}>Estimate</p>
          <div className={cardStyles.itemHeader}>
            <h2 className={styles.pageTitle}>{estimate.title}</h2>
            <span className={`pill ${statusClass}`}>{estimate.status}</span>
          </div>
          {estimate.description && <p className={styles.pageSubtitle}>{estimate.description}</p>}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {estimate.status !== 'accepted' && (
            <button onClick={() => setShowAcceptModal(true)} className="btn-primary">
              Accept & Create Job
            </button>
          )}
          <BackButton href="/estimates" classes="btn-secondary" title="Back to Estimates" />
        </div>
      </div>

      <div className={styles.detailGrid}>
        <div className={`card ${cardStyles.detailSection}`}>
          <h3 className={cardStyles.detailSectionTitle}>Estimate Information</h3>
          <dl className={cardStyles.detailList}>
            <div className={cardStyles.detailItem}>
              <dt className={cardStyles.detailLabel}>Status</dt>
              <dd className={cardStyles.detailValue}>
                <span className={`pill ${statusClass}`}>{estimate.status}</span>
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
              <dd className={cardStyles.detailValue}>{estimate.customer?.name}</dd>
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
        <div className={`card ${cardStyles.detailSection}`} style={{ marginTop: '2rem' }}>
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
        <div className={`card ${cardStyles.detailSection}`} style={{ marginTop: '2rem' }}>
          <h3 className={cardStyles.detailSectionTitle}>Notes</h3>
          <p className={cardStyles.detailValue} style={{ whiteSpace: 'pre-line' }}>{estimate.notes}</p>
        </div>
      )}

      {/* Accept Estimate Modal */}
      {showAcceptModal && (
        <div className={styles.modalOverlay}>
          <div className={`card ${styles.modalContent}`} style={{ maxWidth: '32rem' }}>
            <h3 className={cardStyles.detailSectionTitle}>Accept Estimate & Create Job</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              This will create a new job from this estimate and generate invoices based on the selected payment schedule.
            </p>

            {acceptError && (
              <div style={{
                padding: '1rem',
                marginBottom: '1rem',
                backgroundColor: 'var(--status-overdue-bg)',
                color: 'var(--status-overdue-text)',
                borderRadius: '0.5rem'
              }}>
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

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
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
    </div>
  );
}
