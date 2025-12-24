import styles from '../../styles/pages.module.css';
import Loading from './Loading';

export default function LoadMoreButton({
  hasMore,
  loading,
  onLoadMore,
  label = 'Show More'
}) {
  if (!hasMore || !onLoadMore) return null;

  return (
    <div className={styles.loadMoreContainer}>
      {loading ? (
        <Loading />
      ) : (
        <button onClick={onLoadMore} className="btn-primary">
          {label}
        </button>
      )}
    </div>
  );
}
