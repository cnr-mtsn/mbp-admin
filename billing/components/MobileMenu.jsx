import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../styles/mobile-menu.module.css';
import { getInitials } from '../lib/utils/helpers';
import { isActivePath } from '../lib/utils/navigation';
import Icon from './ui/Icon'

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
            <Icon name="close" classes={styles.closeIcon} />
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
          <Icon name="exit" classes={styles.buttonIcon} />
          Logout
        </button>
      </div>
    </>
  );
}
