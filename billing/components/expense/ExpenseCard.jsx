import Link from "next/link"
import cardStyles from '../../styles/cardItems.module.css'
import { extractUuid } from "../../lib/utils/gid"
import { formatDate, formatMoney, formatStatus } from "../../lib/utils/helpers"
import { getExpenseStatusClass } from "../../lib/utils/statusStyles"

export default function ExpenseCard({ expense, compact = false }) {
  const expenseClass = getExpenseStatusClass(expense.status);

  return (
    <Link href={`/expenses/${extractUuid(expense.id)}`} className="h-full block">
      <div key={expense.id} className={cardStyles.lineItem}>
        <div className={cardStyles.itemHeader}>
          <div className={cardStyles.itemHeaderContent}>
            <p className={cardStyles.itemLabel}>
              {expense.expense_type === 'labor' ? 'Labor' : 'Materials'}
            </p>
            <h4 className={cardStyles.itemTitle}>
              PO: {expense.po_number || 'N/A'}
            </h4>
            {expense.invoice_number && (
              <p className={cardStyles.itemDescription}>
                Invoice #{expense.invoice_number}
              </p>
            )}
            {expense.vendor && !compact && (
              <p className={cardStyles.itemDescription}>
                {expense.vendor}
              </p>
            )}
          </div>
          <span className={`pill ${expenseClass}`}>
            {formatStatus(expense.status?.replace('_', ' '))}
          </span>
        </div>

        <div className={cardStyles.itemFooter}>
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
