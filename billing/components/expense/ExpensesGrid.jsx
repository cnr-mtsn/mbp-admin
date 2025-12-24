import ExpenseCard from "./ExpenseCard"
import styles from '../../styles/pages.module.css';
import { useState } from "react"
import FilterButtons from "../ui/FilterButtons"
import EmptyState from "../ui/EmptyState"
import LoadMoreButton from "../ui/LoadMoreButton"

export default function ExpensesGrid({ expenses, onLoadMore, hasMore = false, loading = false }) {
  const [statusFilter, setStatusFilter] = useState('all');

  // Filter expenses based on status
  const filteredExpenses = statusFilter === 'all'
    ? expenses
    : expenses.filter(expense => expense.status === statusFilter);

  const filters = ['all', 'pending_review', 'assigned', 'approved'];

  const filterLabels = {
    all: 'All',
    pending_review: 'Pending Review',
    assigned: 'Assigned',
    approved: 'Approved'
  };

  const getCount = (filter) => {
    return filter === "all"
      ? expenses.length
      : (expenses.filter(e => e.status === filter)?.length || 0);
  };

  const getEmptyMessage = () => {
    return statusFilter === 'all'
      ? 'No expenses found'
      : `No ${filterLabels[statusFilter].toLowerCase()} expenses found`;
  };

  return (
    <div className="flex flex-col gap-8">
      <FilterButtons
        filters={filters}
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
        getCount={getCount}
        labels={filterLabels}
        capitalize={false}
      />
      {filteredExpenses.length === 0 ? (
        <EmptyState message={getEmptyMessage()} />
      ) : (
        <>
          <div className={styles.autoFillCardGrid}>
            {filteredExpenses.map((expense) => <ExpenseCard key={expense.id} expense={expense} />)}
          </div>
          <LoadMoreButton
            hasMore={hasMore}
            loading={loading}
            onLoadMore={onLoadMore}
          />
        </>
      )}
    </div>
  )
}
