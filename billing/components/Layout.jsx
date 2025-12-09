import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getFullName, getInitials } from '../lib/utils/helpers';
import { buildNavLinks, isActivePath } from '../lib/utils/navigation';
import { Dropdown, DropdownItem } from './ui';
import MobileMenu from './MobileMenu';
import styles from '../styles/layout.module.css';
import MobileClock from './MobileClock'
import Icon from './ui/Icon'
import Loading from './ui/Loading'

export default function Layout({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const { events, asPath } = router;

  // Load user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse user from localStorage', e);
      }
    }
  }, []);

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
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsMobileMenuOpen(false);
    router.push('/account/login');
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
                <Icon name="hamburger-menu" classes={styles.hamburgerIcon} size={12} />
              </button>

              <div className={styles.logo}>
                <Link href="/">
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
                {navLinks.map(({ href, label }, idx) => (
                  <Link
                    href={href}
                    key={`nav-link-${idx}`}
                    className={`nav-link ${isActivePath(router.pathname, href) ? 'nav-link-active' : ''}`}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
            <div className={styles.navRight}>
              {/* Profile Dropdown */}
              {user && (
                <Dropdown
                  trigger={
                    <div className={styles.dropdownTrigger}>
                      <div className="avatar">{getInitials(user)}</div>
                      <Icon name="chevron-down" classes={styles.dropdownItemIcon} />
                    </div>
                  }
                >
                  <DropdownItem
                    onClick={handleLogout}
                    icon={<Icon name="exit" classes={styles.dropdownItemIcon} />}
                  >
                    Logout
                  </DropdownItem>
                </Dropdown>
              )}
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
