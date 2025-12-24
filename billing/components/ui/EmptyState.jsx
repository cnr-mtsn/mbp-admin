import styles from '../../styles/pages.module.css';

export default function EmptyState({ message = 'No items found' }) {
  return (
    <div className={`card ${styles.emptyState}`}>
      <p className="muted">{message}</p>
    </div>
  );
}
