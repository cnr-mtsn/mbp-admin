import InvoiceCard from "./InvoiceCard"
import styles from '../../styles/pages.module.css';
import { useState } from "react"
import FilterButtons from "../ui/FilterButtons"
import EmptyState from "../ui/EmptyState"
import LoadMoreButton from "../ui/LoadMoreButton"

export default function InvoicesGrid({ invoices, onLoadMore, hasMore = false, loading = false, initialFilter = 'all' }) {

    const [statusFilter, setStatusFilter] = useState(initialFilter);

    // Toggle a filter on/off (for multi-select)
    const toggleFilter = (filter) => {
        if (filter === 'all') {
            setStatusFilter('all');
        } else {
            if (statusFilter === 'all') {
                setStatusFilter(filter);
            } else {
                const currentFilters = statusFilter.split(',').map(s => s.trim());
                if (currentFilters.includes(filter)) {
                    const newFilters = currentFilters.filter(f => f !== filter);
                    setStatusFilter(newFilters.length > 0 ? newFilters.join(',') : 'all');
                } else {
                    setStatusFilter([...currentFilters, filter].join(','));
                }
            }
        }
    };

    // Filter invoices based on status (supports comma-separated values)
    const filteredInvoices = statusFilter === 'all'
        ? invoices
        : invoices.filter(invoice => {
            const statuses = statusFilter.split(',').map(s => s.trim());
            return statuses.includes(invoice.status);
          });

    const filters = ['all', 'paid', 'sent', 'draft', 'overdue'];

    const getCount = (filter) => {
        return filter === "all"
            ? invoices.length
            : (invoices.filter(i => i.status === filter)?.length || 0);
    };

    const getEmptyMessage = () => {
        return statusFilter === 'all'
            ? 'No invoices found'
            : `No ${statusFilter} invoices found`;
    };

    return (
        <div className="flex flex-col gap-8">
            <FilterButtons
                filters={filters}
                activeFilter={statusFilter}
                onFilterChange={toggleFilter}
                getCount={getCount}
                multiSelect={true}
            />
            {filteredInvoices.length === 0 ? (
                <EmptyState message={getEmptyMessage()} />
            ) : (
                <>
                    <div className={styles.autoFillCardGrid}>
                        {filteredInvoices.map((invoice) => <InvoiceCard key={invoice.id} invoice={invoice} />)}
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