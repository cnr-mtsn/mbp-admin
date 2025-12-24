import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useQuery, useMutation } from '@apollo/client';
import { GET_EXPENSE, GET_JOBS } from '../../lib/graphql/queries';
import { UPDATE_EXPENSE, ASSIGN_EXPENSE_TO_JOB, DELETE_EXPENSE } from '../../lib/graphql/mutations';
import { extractUuid } from '../../lib/utils/gid';
import { formatCustomerName, formatDate, formatExpenseDescription, formatMoney, formatStatus } from '../../lib/utils/helpers';
import { toGid } from '../../lib/utils/gid';
import styles from '../../styles/pages.module.css';
import cardStyles from '../../styles/cardItems.module.css';
import BackButton from '../../components/ui/BackButton';
import Loading from '../../components/ui/Loading';
import ExpenseForm from '../../components/expense/ExpenseForm';
import SearchableSelect from '../../components/ui/SearchableSelect';
import Icon from '../../components/ui/Icon'

export default function ExpenseDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState('');
  const dialogRef = useRef(null);
  const deleteDialogRef = useRef(null);

  const { data, loading, error, refetch } = useQuery(GET_EXPENSE, {
    variables: { id: id ? toGid('Expense', id) : null },
    skip: !id,
  });

  const { data: jobsData } = useQuery(GET_JOBS, {
    variables: { first: 100 }
  });

  const [updateExpense] = useMutation(UPDATE_EXPENSE);
  const [assignExpenseToJob] = useMutation(ASSIGN_EXPENSE_TO_JOB);
  const [deleteExpense] = useMutation(DELETE_EXPENSE);

  const expense = data?.expense;
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

  useEffect(() => {
    if (showEditModal && dialogRef.current) {
      dialogRef.current.showModal();
    } else if (dialogRef.current) {
      dialogRef.current.close();
    }
  }, [showEditModal]);

  useEffect(() => {
    if (showDeleteModal && deleteDialogRef.current) {
      deleteDialogRef.current.showModal();
    } else if (deleteDialogRef.current) {
      deleteDialogRef.current.close();
    }
  }, [showDeleteModal]);

  const handleEdit = async (updatedData) => {
    try {
      await updateExpense({
        variables: {
          id: toGid('Expense', id),
          input: updatedData,
        },
      });
      setShowEditModal(false);
      refetch();
    } catch (err) {
      console.error('Error updating expense:', err);
      alert('Failed to update expense: ' + err.message);
    }
  };

  const handleAssignJob = async () => {
    if (!selectedJobId) {
      alert('Please select a job');
      return;
    }

    try {
      await assignExpenseToJob({
        variables: {
          expense_id: toGid('Expense', id),
          job_id: selectedJobId,
        },
      });
      refetch();
      setSelectedJobId('');
    } catch (err) {
      console.error('Error assigning expense:', err);
      alert('Failed to assign expense: ' + err.message);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteExpense({
        variables: { id: toGid('Expense', id) },
      });
      router.push('/expenses');
    } catch (err) {
      console.error('Error deleting expense:', err);
      alert('Failed to delete expense: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[90vh] mx-auto">
        <Loading />
      </div>
    );
  }

  if (error || !expense) {
    return (
      <div className={styles.centerState}>
        <div className={styles.stateContent}>
          <h1 className={styles.stateTitleError}>Expense not found</h1>
          <p className={styles.stateMessage}>{error?.message || 'This expense does not exist'}</p>
          <Link href="/expenses" className="btn-primary">
            Back to Expenses
          </Link>
        </div>
      </div>
    );
  }

  const expenseStatusStyles = {
    pending_review: styles.statusOverdue,
    assigned: styles.statusSent,
    approved: styles.statusPaid,
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderContent}>
          <p className={styles.pageLabel}>Expense</p>
          <h2 className={styles.pageTitle}>
            {expense.vendor || 'Manual Expense'}
          </h2>
          {expense.invoice_number && <h3 className={styles.pageSubtitle}>#{expense.invoice_number}</h3>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowEditModal(true)}
            className="btn-secondary"
            title="Edit Expense"
          >
            <Icon name="edit" size={10} />
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className={`btn-secondary ${styles.btnDanger}`}
            title="Delete Expense"
          >
            <Icon name="trash" size={10} />
          </button>
          <BackButton href="/expenses" classes="btn-secondary" />
        </div>
      </div>

      {/* Main Content */}
      <div className={`card ${styles.cardSpacing}`}>
        <div className={cardStyles.detailSection}>
          <div className={cardStyles.itemHeader}>
            <div className={cardStyles.itemHeaderContent}>
              <h3 className={cardStyles.detailSectionTitle}>Expense Details</h3>
            </div>
            <span className={`pill ${expenseStatusStyles[expense.status]}`}>
              {formatStatus(expense.status?.replace('_', ' '))}
            </span>
          </div>

          <dl className={cardStyles.detailGrid}>
            <div className={cardStyles.detailItem}>
              <dt className={cardStyles.detailLabel}>Type</dt>
              <dd className={cardStyles.detailValue}>
                {expense.expense_type === 'labor' ? 'Labor' : 'Materials'}
              </dd>
            </div>

            {expense.vendor && (
              <div className={cardStyles.detailItem}>
                <dt className={cardStyles.detailLabel}>Vendor</dt>
                <dd className={cardStyles.detailValue}>{expense.vendor}</dd>
              </div>
            )}

            {expense.invoice_number && (
              <div className={cardStyles.detailItem}>
                <dt className={cardStyles.detailLabel}>Invoice Number</dt>
                <dd className={cardStyles.detailValue}>{expense.invoice_number}</dd>
              </div>
            )}

            {expense.po_number && (
              <div className={cardStyles.detailItem}>
                <dt className={cardStyles.detailLabel}>PO Number</dt>
                <dd className={cardStyles.detailValue}>{expense.po_number}</dd>
              </div>
            )}

            {expense.invoice_date && (
              <div className={cardStyles.detailItem}>
                <dt className={cardStyles.detailLabel}>Invoice Date</dt>
                <dd className={cardStyles.detailValue}>{formatDate(expense.invoice_date)}</dd>
              </div>
            )}

            <div className={cardStyles.detailItem}>
              <dt className={cardStyles.detailLabel}>Total</dt>
              <dd className={`${cardStyles.detailValue} ${styles.valueLarge}`}>
                {formatMoney(expense.total)}
              </dd>
            </div>

            {expense.subtotal && (
              <div className={cardStyles.detailItem}>
                <dt className={cardStyles.detailLabel}>Subtotal</dt>
                <dd className={cardStyles.detailValue}>{formatMoney(expense.subtotal)}</dd>
              </div>
            )}

            {expense.tax && (
              <div className={cardStyles.detailItem}>
                <dt className={cardStyles.detailLabel}>Tax</dt>
                <dd className={cardStyles.detailValue}>{formatMoney(expense.tax)}</dd>
              </div>
            )}
          </dl>

          {expense.description && (
            <div className="mt-6">
              <h4 className={cardStyles.detailLabel}>Description</h4>
              <p className={cardStyles.detailValue}>{formatExpenseDescription(expense.description)}</p>
            </div>
          )}

          {expense.notes && (
            <div className="mt-6">
              <h4 className={cardStyles.detailLabel}>Notes</h4>
              <p className={cardStyles.detailValue}>{expense.notes}</p>
            </div>
          )}

          {/* Job Assignment - integrated into details card */}
          <div className={styles.jobAssignmentSection}>
            <h4 className={cardStyles.detailLabel}>Job Assignment</h4>
            {expense.job ? (
              <div className={styles.jobAssignmentContent}>
                <Link href={`/jobs/${extractUuid(expense.job.id)}`} className={styles.jobAssignmentLink}>
                  {expense.job.title}
                </Link>
                {expense.job.customer && (
                  <span className={styles.jobAssignmentCustomer}>
                    {formatCustomerName(expense.job.customer)}
                  </span>
                )}
              </div>
            ) : (
              <div className={styles.jobAssignmentUnassigned}>
                <SearchableSelect
                  id="job_assignment"
                  name="job_assignment"
                  value={selectedJobId}
                  onChange={(value) => setSelectedJobId(value)}
                  options={jobOptions}
                  filterFn={filterJobs}
                  placeholder="Search jobs..."
                  emptyMessage="No jobs found"
                />
                <button onClick={handleAssignJob} className="btn-primary" disabled={!selectedJobId}>
                  Assign
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Line Items */}
      {expense.line_items && expense.line_items.length > 0 && (
        <div className={`card ${styles.cardSpacing}`}>
          <div className={cardStyles.detailSection}>
            <h3 className={cardStyles.detailSectionTitle}>Line Items</h3>
            <div className={styles.lineItemsList}>
              {expense.line_items.map((item, index) => (
                <div key={index} className={styles.lineItemRow}>
                  <div className={styles.lineItemDesc}>
                    <p className={styles.lineItemDescText}>{formatExpenseDescription(item.description)}</p>
                    <p className={styles.lineItemMeta}>
                      {item.quantity ? item.quantity : ''}
                      {item.quantity && item.unit_price ? ' × ' : ''}
                      {item.unit_price ? formatMoney(item.unit_price) : ''}
                    </p>
                  </div>
                  <div className={styles.lineItemAmountCol}>
                    {formatMoney(item.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}


      {/* Edit Modal */}
      <dialog ref={dialogRef} className={styles.modal}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h3>Edit Expense</h3>
            <button onClick={() => setShowEditModal(false)} className={styles.modalClose}>
              <Icon name="close" size={10} />
            </button>
          </div>
          <ExpenseForm
            initialData={expense}
            onSubmit={handleEdit}
            onCancel={() => setShowEditModal(false)}
            submitLabel="Save Changes"
          />
        </div>
      </dialog>

      {/* Delete Confirmation Modal */}
      <dialog ref={deleteDialogRef} className={styles.modal}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h3>Delete Expense</h3>
            <button onClick={() => setShowDeleteModal(false)} className={styles.modalClose}>
              ×
            </button>
          </div>
          <div className={styles.modalBody}>
            <p>Are you sure you want to delete this expense?</p>
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
    </div>
  );
}
