import Link from "next/link"
import cardStyles from '../../styles/cardItems.module.css'
import styles from '../../styles/pages.module.css';
import { extractUuid } from "../../lib/utils/gid"
import { formatDate, formatMoney, formatStatus } from "../../lib/utils/helpers"

export default function ExpenseCard({ expense, compact = false }) {
  const expenseStatusStyles = {
    pending_review: styles.statusOverdue, // Orange
    assigned: styles.statusSent, // Blue
    approved: styles.statusPaid, // Green
  };

  const expenseClass = expenseStatusStyles[expense.status] || styles.statusDraft;

  return (
    <Link href={`/expenses/${extractUuid(expense.id)}`} style={{ height: '100%' }}>
      <div key={expense.id} className={cardStyles.lineItem}>
        <div className={cardStyles.itemHeader}>
          <div className={cardStyles.itemHeaderContent}>
            <p className={cardStyles.itemLabel}>
              {expense.expense_type === 'labor' ? 'Labor' : 'Materials'}
            </p>
            <h4 className={cardStyles.itemTitle}>
              {expense.vendor || 'Manual Expense'}
            </h4>
            {expense.invoice_number && (
              <p className={cardStyles.itemDescription}>
                Invoice #{expense.invoice_number}
              </p>
            )}
            {expense.po_number && !compact && (
              <p className={cardStyles.itemDescription}>
                PO: {expense.po_number}
              </p>
            )}
          </div>
          <span className={`pill ${expenseClass}`}>
            {formatStatus(expense.status?.replace('_', ' '))}
          </span>
        </div>

        <div className={cardStyles.itemFooter} style={{ marginTop: 'auto' }}>
          <p className={cardStyles.itemTitle}>{formatMoney(expense.total || 0)}</p>
          {expense.invoice_date && (
            <p className={cardStyles.itemDescription}>
              {formatDate(expense.invoice_date)}
            </p>
          )}
          {!expense.invoice_date && expense.created_at && (
            <p className={cardStyles.itemDescription}>
              {formatDate(expense.created_at)}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
