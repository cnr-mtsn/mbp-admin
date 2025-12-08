import { useEffect, useState } from 'react';
import styles from '../styles/layout.module.css';
import { formatDate, formatTime } from '../lib/utils/helpers'

export default function MobileClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.mobileClock} aria-label="Current time">
      <span className={styles.mobileClockTime}>{formatTime(now)}</span>
      <span className={styles.mobileClockDate}>{formatDate(now)}</span>
    </div>
  );
}
