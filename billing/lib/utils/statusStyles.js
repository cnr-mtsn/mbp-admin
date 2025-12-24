import styles from '../../styles/pages.module.css';

export const jobStatusStyles = {
  completed: styles.statusCompleted,
  in_progress: styles.statusInProgress,
  pending: styles.statusPending,
  paid: styles.statusPaid,
};

export const invoiceStatusStyles = {
  paid: styles.statusPaid,
  sent: styles.statusSent,
  overdue: styles.statusOverdue,
  draft: styles.statusDraft,
};

export const expenseStatusStyles = {
  pending_review: styles.statusOverdue,
  assigned: styles.statusSent,
  approved: styles.statusPaid,
};

export function getJobStatusClass(status) {
  return jobStatusStyles[status] || jobStatusStyles.pending;
}

export function getInvoiceStatusClass(status) {
  return invoiceStatusStyles[status] || invoiceStatusStyles.draft;
}

export function getExpenseStatusClass(status) {
  return expenseStatusStyles[status] || styles.statusDraft;
}
