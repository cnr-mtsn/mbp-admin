import JobCard from "./JobCard"
import styles from '../../styles/pages.module.css';
import { useState, useMemo } from "react"

export default function JobsGrid({ jobs, showFilters = true, showSort = true, onLoadMore, hasMore = false, loading = false, initialStatusFilter = 'all' }) {

    const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
    const [paymentScheduleFilter, setPaymentScheduleFilter] = useState('all');
    const [sortKey, setSortKey] = useState('status');

    // Filter jobs based on status and payment schedule
    const filteredJobs = useMemo(() => {
        let filtered = jobs;

        if (statusFilter !== 'all') {
            filtered = filtered.filter(job => job.status === statusFilter);
        }

        if (paymentScheduleFilter !== 'all') {
            filtered = filtered.filter(job => job.payment_schedule === paymentScheduleFilter);
        }

        return filtered;
    }, [jobs, statusFilter, paymentScheduleFilter]);

    // Sort jobs
    const sortedJobs = useMemo(() => {
        const sorted = [...filteredJobs];

        switch (sortKey) {
            case 'status':
                // Custom sort: in_progress first, then pending, completed, paid
                const statusOrder = { in_progress: 0, pending: 1, completed: 2, paid: 3 };
                sorted.sort((a, b) => {
                    const orderA = statusOrder[a.status] ?? 999;
                    const orderB = statusOrder[b.status] ?? 999;
                    return orderA - orderB;
                });
                break;
            case 'created_at':
                sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                break;
            case 'title':
                sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
                break;
            case 'total_amount':
                sorted.sort((a, b) => (b.total_amount || 0) - (a.total_amount || 0));
                break;
            default:
                break;
        }

        return sorted;
    }, [filteredJobs, sortKey]);

    const statusFilters = ['all', 'pending', 'in_progress', 'completed', 'paid'];
    const paymentScheduleFilters = ['all', '50/40/10', '50/50', '100'];

    return (
        <div className="flex flex-col gap-8">
            {showFilters && (
                <div className="flex flex-col gap-3">
                    {/* Status Filters */}
                    <div className="flex flex-wrap gap-3">
                        {statusFilters.map(filter => {
                            const count = filter === "all"
                                ? jobs.length
                                : (jobs.filter(j => j.status === filter)?.length || 0);
                            const classes = `capitalize ${statusFilter === filter ? 'btn-primary' : 'btn-secondary'}`;
                            const displayText = filter === 'all'
                                ? `All Jobs (${count})`
                                : `${filter.replace('_', ' ')} (${count})`;
                            return (
                                <button
                                    onClick={() => setStatusFilter(filter)}
                                    className={classes}
                                    key={`status-filter-${filter}`}
                                >
                                    {displayText}
                                </button>
                            )
                        })}
                    </div>

                    {/* Payment Schedule Filters */}
                    <div className="flex flex-wrap gap-3">
                        {paymentScheduleFilters.map(filter => {
                            const count = filter === "all"
                                ? jobs.length
                                : (jobs.filter(j => j.payment_schedule === filter)?.length || 0);
                            const classes = `${paymentScheduleFilter === filter ? 'btn-primary' : 'btn-secondary'}`;
                            const displayText = filter === 'all'
                                ? `All Schedules (${count})`
                                : `${filter} (${count})`;
                            return (
                                <button
                                    onClick={() => setPaymentScheduleFilter(filter)}
                                    className={classes}
                                    key={`schedule-filter-${filter}`}
                                >
                                    {displayText}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Sort Options */}
            {showSort && sortedJobs.length > 0 && (
                <div className="flex flex-wrap gap-3">
                    <label style={{ color: 'var(--text-muted)', fontSize: '0.875rem', alignSelf: 'center' }}>
                        Sort by:
                    </label>
                    <select
                        value={sortKey}
                        onChange={(e) => setSortKey(e.target.value)}
                        className={styles.filterSelect}
                        style={{ width: 'auto' }}
                    >
                        <option value="status">Status (In Progress First)</option>
                        <option value="created_at">Date (Newest)</option>
                        <option value="title">Title</option>
                        <option value="total_amount">Amount</option>
                    </select>
                </div>
            )}

            {sortedJobs.length === 0 ? (
                <div className={`card ${styles.emptyState}`}>
                    <p className="muted">
                        {jobs.length === 0
                            ? 'No jobs found'
                            : 'No jobs match your filter criteria'}
                    </p>
                </div>
            ) : (
                <>
                    <div className={styles.cardGrid} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                        {sortedJobs.map((job) => <JobCard key={job.id} job={job} />)}
                    </div>

                    {/* Show More Button */}
                    {hasMore && onLoadMore && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
                            {loading ? <Loading /> : (
                                <button
                                    onClick={onLoadMore}
                                    className="btn-primary"
                                >
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
