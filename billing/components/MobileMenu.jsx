import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../styles/mobile-menu.module.css';
import { getInitials } from '../lib/utils/helpers';
import { isActivePath } from '../lib/utils/navigation';

export default function MobileMenu({ isOpen, onClose, user, onLogout, navLinks }) {
  const router = useRouter();

  // Close menu when route changes
  useEffect(() => {
    const handleRouteChange = () => {
      onClose();
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router, onClose]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className={styles.overlay} onClick={onClose} />

      {/* Menu */}
      <div className={styles.menu}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>MBP Billing</h2>
          <button onClick={onClose} className={styles.closeButton} aria-label="Close menu">
            <svg className={styles.closeIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* User Section */}
        {user && (
          <div className={styles.userSection}>
            <Link href="/account/profile">
              <div className={styles.userInfo}>
                <div className="avatar">{getInitials(user)}</div>
                <div className={styles.userDetails}>
                  <div className={styles.userName}>
                    {user?.name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim()}
                  </div>
                  <div className={styles.userRole}>{user?.role || 'User'}</div>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Navigation Links */}
        <nav className={styles.nav}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.navLink} ${isActivePath(router.pathname, link.href) ? styles.navLinkActive : ''}`}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </nav>

        <button onClick={onLogout} className={styles.logoutButton}>
          <svg className={styles.buttonIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
    </>
  );
}
