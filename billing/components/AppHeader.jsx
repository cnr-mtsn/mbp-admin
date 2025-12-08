import Link from 'next/link';
import styles from '../styles/appHeader.module.css';

export default function AppHeader({ onLogout, children }) {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href="/" className={styles.logoLink}>
          <img
            src="/long-logo-no-bg.png"
            alt="Matson Brothers Painting"
            className={styles.logo}
            width={200}
          />
        </Link>

        <div className={styles.actions}>
          {children}
          {onLogout && (
            <button onClick={onLogout} className="btn-secondary">
              Logout
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
