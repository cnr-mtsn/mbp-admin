import Icon from './Icon';
import styles from '../../styles/alert.module.css';

export default function Alert({ isOpen, onClose, title, message, type = 'info' }) {
  if (!isOpen) return null;

  const icons = {
    success: 'check-circle',
    error: 'alert-circle',
    info: 'info',
    warning: 'alert-triangle'
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={`${styles.alert} ${styles[type]}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.iconWrapper}>
          <Icon name={icons[type]} size={24} />
        </div>
        <div className={styles.content}>
          {title && <h3 className={styles.title}>{title}</h3>}
          <p className={styles.message}>{message}</p>
        </div>
        <button
          onClick={onClose}
          className={styles.closeButton}
          aria-label="Close"
        >
          <Icon name="x" size={16} />
        </button>
      </div>
    </div>
  );
}
