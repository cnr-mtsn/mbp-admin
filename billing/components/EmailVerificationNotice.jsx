import { useState } from 'react';
import { authAPI } from '../api/client';
import styles from '../styles/email-verification-notice.module.css';
import Icon from './ui/Icon'

export default function EmailVerificationNotice({ user, onVerificationSent }) {
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSendVerification = async () => {
    setIsSending(true);
    setMessage('');
    setError('');

    try {
      await authAPI.sendVerificationEmail();
      setMessage('Verification email sent! Please check your inbox.');
      if (onVerificationSent) {
        onVerificationSent();
      }
    } catch (err) {
      setError(err.message || 'Failed to send verification email');
    } finally {
      setIsSending(false);
    }
  };

  // Don't show if user is already verified
  if (user?.email_verified) {
    return null;
  }

  return (
    <div className={styles.notice}>
      <div className={styles.content}>
        <div className={styles.icon}>
          <Icon name="alert-triangle" size={20} />
        </div>
        <div className={styles.text}>
          <strong>Email not verified.</strong> 
          <span>Please check your inbox for a verification email.</span>
          {message && <div className={styles.success}>{message}</div>}
          {error && <div className={styles.error}>{error}</div>}
        </div>
        <button
          onClick={handleSendVerification}
          disabled={isSending}
          className={styles.button}
        >
          {isSending ? 'Sending...' : 'Resend verification email'}
        </button>
      </div>
    </div>
  );
}
