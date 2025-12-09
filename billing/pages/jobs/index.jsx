import { useRouter } from 'next/router';
import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { useState, useMemo, useEffect, useRef } from 'react';
import { GET_JOBS } from '../../lib/graphql/queries';
import styles from '../../styles/pages.module.css';
import BackButton from '../../components/ui/BackButton'
import JobsGrid from '../../components/jobs/JobsGrid';

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
  const [searchFilter, setSearchFilter] = useState('');
  const [itemsToShow, setItemsToShow] = useState(10);

  const { data, loading, error, fetchMore } = useQuery(GET_JOBS, {
    variables: {
      sortKey: 'status',
      first: itemsToShow,
    },
    notifyOnNetworkStatusChange: false,
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

  const handleLoadMore = () => {
    const scrollPosition = window.scrollY;
    const newItemsToShow = itemsToShow + 10;
    setItemsToShow(newItemsToShow);
    fetchMore({
      variables: {
        first: newItemsToShow,
      },
    }).then(() => {
      // Restore scroll position after data is loaded
      window.scrollTo(0, scrollPosition);
    });
  };

  // Reset items to show when search changes
  useEffect(() => {
    setItemsToShow(10);
  }, [searchFilter]);

  if (loading && allJobs.length === 0) {
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

  // Determine if there are more items to load
  const hasMore = allJobs.length === itemsToShow && !searchFilter;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderContent}>
          <p className={styles.pageLabel}>Pipeline</p>
          <h2 className={styles.pageTitle}>Jobs</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link href="/jobs/new" className="btn-primary">Create New Job</Link>
          <BackButton href="/" classes="btn-secondary" />
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
          {searchFilter && (
            <button
              onClick={() => setSearchFilter('')}
              className="btn-secondary"
            >
              Clear Search
            </button>
          )}
        </div>
      </div>

      <JobsGrid
        jobs={filteredJobs}
        onLoadMore={handleLoadMore}
        hasMore={hasMore}
        loading={loading}
      />
    </div>
  );
}
