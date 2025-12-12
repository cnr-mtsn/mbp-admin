import InvoiceCard from "./InvoiceCard"
import styles from '../../styles/pages.module.css';
import { useState } from "react"
import Loading from "../ui/Loading"

export default function InvoicesGrid({ invoices, onLoadMore, hasMore = false, loading = false, initialFilter = 'all' }) {

    const [statusFilter, setStatusFilter] = useState(initialFilter);
    // Toggle a filter on/off (for multi-select)
    const toggleFilter = (filter) => {
        if (filter === 'all') {
            setStatusFilter('all');
        } else {
            if (statusFilter === 'all') {
                // If "all" is selected, replace with just this filter
                setStatusFilter(filter);
            } else {
                const currentFilters = statusFilter.split(',').map(s => s.trim());
                if (currentFilters.includes(filter)) {
                    // Remove this filter
                    const newFilters = currentFilters.filter(f => f !== filter);
                    setStatusFilter(newFilters.length > 0 ? newFilters.join(',') : 'all');
                } else {
                    // Add this filter
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

    const filters = ['all', 'paid', 'sent', 'draft', 'overdue']
    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-wrap gap-3 mb-6">
                {filters.map(filter => {
                    const count = filter === "all" ? invoices.length : (invoices.filter(i => i.status === filter)?.length || 0)
                    // Check if this filter is active (supports comma-separated values)
                    const isActive = statusFilter === 'all'
                        ? filter === 'all'
                        : statusFilter.split(',').map(s => s.trim()).includes(filter);
                    const classes = `capitalize ${isActive ? 'btn-primary' : 'btn-secondary'}`
                    const displayText = `${filter} (${count})`
                    return (
                        <button
                            onClick={() => toggleFilter(filter)}
                            className={classes}
                            key={`filter-${filter}`}
                        >
                            {displayText}
                        </button>
                    )
                })}
            </div>
            {filteredInvoices.length === 0 ? (
                <div className={`card ${styles.emptyState}`}>
                    <p className="muted">
                        {statusFilter === 'all' ? 'No invoices found' : `No ${statusFilter} invoices found`}
                    </p>
                </div>
            ) : (
                <>
                    <div className={styles.cardGrid} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                        {filteredInvoices.map((invoice) => <InvoiceCard key={invoice.id} invoice={invoice} />)}
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