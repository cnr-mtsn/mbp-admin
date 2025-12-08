import { useRouter } from 'next/router';
import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { useState, useMemo, useEffect, useRef } from 'react';
import { GET_JOBS } from '../../lib/graphql/queries';
import { extractUuid } from '../../lib/utils/gid';
import { formatMoney } from '../../lib/utils/helpers';
import styles from '../../styles/pages.module.css';
import cardStyles from '../../styles/cardItems.module.css';

const statusStyles = {
  completed: styles.statusCompleted,
  in_progress: styles.statusInProgress,
  pending: styles.statusPending,
  paid: styles.statusPaid,
};

// Separate component for debounced search to prevent re-renders
function DebouncedSearchInput({ value, onChange, placeholder, className }) {
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      onChange(newValue);
    }, 300);
  };

  return (
    <input
      type="text"
      placeholder={placeholder}
      value={localValue}
      onChange={handleChange}
      className={className}
    />
  );
}

export default function Jobs() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentScheduleFilter, setPaymentScheduleFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [sortKey, setSortKey] = useState('status');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Only send backend filters for status and payment_schedule, search is client-side
  const backendFilters = useMemo(() => {
    const f = {};
    if (statusFilter) f.status = statusFilter;
    if (paymentScheduleFilter) f.payment_schedule = paymentScheduleFilter;
    return Object.keys(f).length > 0 ? f : undefined;
  }, [statusFilter, paymentScheduleFilter]);

  const { data, loading, error } = useQuery(GET_JOBS, {
    variables: {
      filters: backendFilters,
      sortKey,
    },
  });

  const allJobs = data?.jobs || [];

  // Client-side search filtering
  const filteredJobs = useMemo(() => {
    if (!searchFilter) return allJobs;

    const searchLower = searchFilter.toLowerCase();
    return allJobs.filter(job =>
      job.title?.toLowerCase().includes(searchLower) ||
      job.description?.toLowerCase().includes(searchLower) ||
      job.customer?.name?.toLowerCase().includes(searchLower)
    );
  }, [allJobs, searchFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedJobs = filteredJobs.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, paymentScheduleFilter, searchFilter, sortKey]);

  if (loading) {
    return (
      <div className={styles.centerState}>
        <div className={styles.stateContent}>
          <h1 className={styles.stateTitle}>Loading jobs...</h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.centerState}>
        <div className={styles.stateContent}>
          <h1 className={styles.stateTitleError}>Error loading jobs</h1>
          <p className={styles.stateMessage}>{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderContent}>
          <p className={styles.pageLabel}>Pipeline</p>
          <h2 className={styles.pageTitle}>Jobs</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link href="/jobs/new" className="btn-primary">Create New Job</Link>
          <Link href="/" className="btn-secondary">Back to Dashboard</Link>
        </div>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <DebouncedSearchInput
            placeholder="Search jobs..."
            value={searchFilter}
            onChange={setSearchFilter}
            className={styles.searchInput}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="paid">Paid</option>
          </select>
          <select
            value={paymentScheduleFilter}
            onChange={(e) => setPaymentScheduleFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">All Payment Schedules</option>
            <option value="50/40/10">50/40/10</option>
            <option value="50/50">50/50</option>
            <option value="100">100</option>
          </select>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="status">Sort by Status (In Progress First)</option>
            <option value="created_at">Sort by Date (Newest)</option>
            <option value="title">Sort by Title</option>
            <option value="total_amount">Sort by Amount</option>
          </select>
          {(statusFilter || paymentScheduleFilter || searchFilter) && (
            <button
              onClick={() => {
                setStatusFilter('');
                setPaymentScheduleFilter('');
                setSearchFilter('');
              }}
              className="btn-secondary"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className={styles.cardGrid}>
        {paginatedJobs.map((job) => {
          const statusClass = statusStyles[job.status] || statusStyles.pending;

          return (
            <Link href={`/jobs/${extractUuid(job.id)}`} key={job.id}>
              <div className="card">
                <div className={cardStyles.itemHeader}>
                  <div className={cardStyles.itemHeaderContent}>
                    <p className={cardStyles.itemLabel}>Job</p>
                    <h3 className={cardStyles.itemTitle}>{job.title}</h3>
                    <p className={cardStyles.itemDescription}>{job.description || 'No description provided.'}</p>
                  </div>
                  <span className={`pill ${statusClass}`}>{job.status || 'pending'}</span>
                </div>

                <div className={cardStyles.itemTags}>
                  <span className={cardStyles.itemTag}>
                    {job.customer?.name || 'Unassigned customer'}
                  </span>
                  <span className={cardStyles.itemTag}>
                    {job.payment_schedule || 'Schedule TBD'}
                  </span>
                </div>

                <div className={cardStyles.itemFooter}>
                  <div>
                    <p className={cardStyles.itemTitle}>
                      {formatMoney(job.total_amount || 0)}
                    </p>
                    <p className={cardStyles.itemDescription}>Paid: {formatMoney(job.amount_paid || 0)}</p>
                  </div>
                    View
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {filteredJobs.length === 0 && (
        <div className={`card ${styles.emptyState}`}>
          <p className="muted">
            {allJobs.length === 0 ? 'No jobs found' : 'No jobs match your search criteria'}
          </p>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '1rem',
          marginTop: '2rem',
          paddingBottom: '2rem'
        }}>
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="btn-secondary"
            style={{ opacity: currentPage === 1 ? 0.5 : 1 }}
          >
            Previous
          </button>
          <span style={{ color: 'var(--color-gray-600)' }}>
            Page {currentPage} of {totalPages} ({filteredJobs.length} jobs)
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="btn-secondary"
            style={{ opacity: currentPage === totalPages ? 0.5 : 1 }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
