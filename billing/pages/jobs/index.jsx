import { useRouter } from 'next/router';
import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { useState, useMemo, useEffect, useRef } from 'react';
import { GET_JOBS } from '../../lib/graphql/queries';
import styles from '../../styles/pages.module.css';
import BackButton from '../../components/ui/BackButton'
import JobsGrid from '../../components/jobs/JobsGrid';
import Loading from '../../components/ui/Loading'
import Icon from '../../components/ui/Icon'

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
  const [allJobs, setAllJobs] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);

  const { data, loading, error, fetchMore } = useQuery(GET_JOBS, {
    variables: {
      sortKey: 'status',
      first: 10,
      offset: 0,
    },
    notifyOnNetworkStatusChange: false,
    onCompleted: (data) => {
      setAllJobs(data?.jobs || []);
    },
  });

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

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const result = await fetchMore({
        variables: {
          first: 10,
          offset: allJobs.length,
        },
      });

      setAllJobs(prev => [...prev, ...(result.data?.jobs || [])]);
    } finally {
      setLoadingMore(false);
    }
  };

  // Reset jobs when search changes
  useEffect(() => {
    if (data?.jobs) {
      setAllJobs(data.jobs);
    }
  }, [searchFilter, data]);

  if (loading && allJobs.length === 0) {
    return (
      <div className="flex items-center justify-center h-[90vh] mx-auto">
        <Loading />
      </div>
    )
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

  // Determine if there are more items to load - check if we got exactly 10 items in the last fetch
  const hasMore = (data?.jobs?.length === 10 || allJobs.length % 10 === 0) && !searchFilter && allJobs.length > 0;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderContent}>
          <p className={styles.pageLabel}>Pipeline</p>
          <h2 className={styles.pageTitle}>Jobs</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link href="/jobs/new" className="btn-primary">
            <Icon name="add" size={10} />
          </Link>
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
        loading={loadingMore}
      />
    </div>
  );
}
