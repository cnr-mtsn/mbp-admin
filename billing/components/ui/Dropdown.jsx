import { useState, useRef, useEffect } from 'react';
import styles from '../../styles/dropdown.module.css';

export default function Dropdown({ trigger, children, align = 'right' }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const menuClass = align === 'right'
    ? `${styles.menu} ${styles.menuRight}`
    : `${styles.menu} ${styles.menuLeft}`;

  return (
    <div
      ref={dropdownRef}
      className={styles.container}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <div className={styles.trigger}>
        {trigger}
      </div>
      {isOpen && (
        <div className={menuClass}>
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({ children, onClick, icon }) {
  return (
    <button
      onClick={onClick}
      className={`dropdown-item ${styles.item}`}
    >
      {icon && <span className={styles.itemIcon}>{icon}</span>}
      {children}
    </button>
  );
}
