import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import useAuthStore from '../store/authStore';
import { getFullName, getInitials } from '../utils/helpers';
import { buildNavLinks, isActivePath } from '../utils/navigation';
import { Dropdown, DropdownItem } from './ui';
import MobileMenu from './MobileMenu';
import MobileClock from './MobileClock';
import styles from '../styles/layout.module.css';

export default function Layout({ children }) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const { events, asPath } = router;

  useEffect(() => {
    const handleStart = (url) => {
      if (url !== asPath) {
        setIsNavigating(true);
      }
    };

    const handleEnd = () => setIsNavigating(false);

    events.on('routeChangeStart', handleStart);
    events.on('routeChangeComplete', handleEnd);
    events.on('routeChangeError', handleEnd);

    return () => {
      events.off('routeChangeStart', handleStart);
      events.off('routeChangeComplete', handleEnd);
      events.off('routeChangeError', handleEnd);
    };
  }, [asPath, events]);

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
  };

  const fullName = getFullName(user);

  const navLinks = buildNavLinks(user);

  return (
    <div className={styles.wrapper}>
      {isNavigating && (
        <div className={styles.pageProgress}>
          <span className={styles.pageProgressBar} />
        </div>
      )}
      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        user={user}
        onLogout={handleLogout}
        navLinks={navLinks}
      />

      <nav className={styles.nav}>
        <div className="container" style={{ maxWidth: '80rem' }}>
          <div className={styles.navContainer}>
            <div className={styles.navLeft}>
              {/* Mobile Hamburger Button */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className={styles.hamburgerButton}
                aria-label="Open menu"
              >
                <svg className={styles.hamburgerIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <div className={styles.logo}>
                <Link href="/">
                {/* <h1 className={styles.logoText}>
                  Paint Inventory
                  </h1> */}
                  <img
                    src="/long-logo-no-bg.png"
                    alt="Logo"
                    className={styles.logo}
                    width={200}
                  />
                </Link>
              </div>

              <MobileClock />

              <div className={`${styles.navLinks} ml-10`}>
                {navLinks.map(({ href, label }, idx) => <Link href={href} key={`nav-link-${idx}`} className={`nav-link ${isActivePath(router.pathname, href) ? 'nav-link-active' : ''}`}>{label}</Link>)}

              </div>
            </div>
            <div className={styles.navRight}>
              {/* Profile Dropdown */}
              <Dropdown
                trigger={
                  <div className={styles.dropdownTrigger}>
                    <div className="avatar">{getInitials(user)}</div>
                    <svg className={styles.dropdownIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                }
              >
                <DropdownItem
                  onClick={() => router.push('/account/profile')}
                  icon={
                    <svg className={styles.dropdownItemIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  }
                >
                  Profile
                </DropdownItem>
                <div className={styles.divider} />
                <DropdownItem
                  onClick={handleLogout}
                  icon={
                    <svg className={styles.dropdownItemIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  }
                >
                  Logout
                </DropdownItem>
              </Dropdown>
            </div>
          </div>
        </div>
      </nav>

      <main className={`container ${styles.main}`}>
        <div key={asPath} className={styles.pageTransition}>
          {children}
        </div>
      </main>
    </div>
  );
}
