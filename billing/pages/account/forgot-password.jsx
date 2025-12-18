import { useState } from 'react';
import Link from 'next/link';
import styles from '../../styles/login.module.css';
import { authAPI } from '../../api/client';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await authAPI.forgotPassword(email);
      setIsSuccess(true);
    } catch (err) {
      // Show error for rate limiting only
      if (err.message.includes('Too many password reset attempts')) {
        setError(err.message);
      } else {
        // For all other errors, still show success message (email enumeration protection)
        setIsSuccess(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <img
        src="/long-logo-no-bg.png"
        alt="Logo"
        className={styles.logo}
      />
      <div className={styles.formWrapper}>
        {isSuccess ? (
          <div className={styles.form}>
            <div className={styles.successAlert}>
              <div className={styles.successText}>
                If an account exists with that email, you will receive password reset instructions.
              </div>
            </div>
            <div className={styles.registerLink}>
              <Link href="/account/login">
                Return to login
              </Link>
            </div>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <h2 className={styles.formTitle}>Reset your password</h2>
            <p className={styles.formDescription}>
              Enter your email address and we'll send you instructions to reset your password.
            </p>

            {error && (
              <div className={styles.errorAlert}>
                <div className={styles.errorText}>{error}</div>
              </div>
            )}

            <div className={styles.inputGroup}>
              <div>
                <label htmlFor="email" className={styles.visuallyHidden}>
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className={styles.input}
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={styles.submitButton}
              >
                {isLoading ? 'Sending...' : 'Send reset link'}
              </button>
            </div>

            <div className={styles.registerLink}>
              <Link href="/account/login">
                Back to login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}

export default ForgotPassword;
