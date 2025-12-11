import ExpenseCard from "./ExpenseCard"
import styles from '../../styles/pages.module.css';
import { useState } from "react"
import Loading from "../ui/Loading"

export default function ExpensesGrid({ expenses, onLoadMore, hasMore = false, loading = false }) {
  const [statusFilter, setStatusFilter] = useState('all');

  // Filter expenses based on status
  const filteredExpenses = statusFilter === 'all'
    ? expenses
    : expenses.filter(expense => expense.status === statusFilter);

  const filters = ['all', 'pending_review', 'assigned', 'approved']

  const filterLabels = {
    all: 'All',
    pending_review: 'Pending Review',
    assigned: 'Assigned',
    approved: 'Approved'
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap gap-3 mb-6">
        {filters.map(filter => {
          const count = filter === "all" ? expenses.length : (expenses.filter(e => e.status === filter)?.length || 0)
          const classes = `${statusFilter === filter ? 'btn-primary' : 'btn-secondary'}`
          const displayText = `${filterLabels[filter]} (${count})`
          return (
            <button
              onClick={() => setStatusFilter(filter)}
              className={classes}
              key={`filter-${filter}`}
            >
              {displayText}
            </button>
          )
        })}
      </div>
      {filteredExpenses.length === 0 ? (
        <div className={`card ${styles.emptyState}`}>
          <p className="muted">
            {statusFilter === 'all' ? 'No expenses found' : `No ${filterLabels[statusFilter].toLowerCase()} expenses found`}
          </p>
        </div>
      ) : (
        <>
          <div className={styles.cardGrid} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {filteredExpenses.map((expense) => <ExpenseCard key={expense.id} expense={expense} />)}
          </div>

          {/* Show More Button */}
          {hasMore && onLoadMore && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
              {loading ? <Loading /> : (
                <button onClick={onLoadMore} className="btn-primary">
                  Show More
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
