import InvoiceCard from "./InvoiceCard"
import styles from '../../styles/pages.module.css';
import { useState } from "react"
import Loading from "../ui/Loading"

export default function InvoicesGrid({ invoices, onLoadMore, hasMore = false, loading = false }) {

    const [statusFilter, setStatusFilter] = useState('all');

    // Filter invoices based on status
    const filteredInvoices = statusFilter === 'all'
        ? invoices
        : invoices.filter(invoice => invoice.status === statusFilter);

    const filters = ['all', 'paid', 'sent', 'draft', 'overdue']
    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-wrap gap-3 mb-6">
                {filters.map(filter => {
                    const count = filter === "all" ? invoices.length : (invoices.filter(i => i.status === filter)?.length || 0)
                    const classes = `capitalize ${statusFilter === filter ? 'btn-primary' : 'btn-secondary'}`
                    const displayText = `${filter} (${count})`
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