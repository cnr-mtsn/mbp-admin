import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../../styles/login.module.css';
import { authAPI } from '../../api/client';

function ResetPassword() {
  const router = useRouter();
  const { token } = router.query;

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if token exists in URL
    if (router.isReady && !token) {
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [router.isReady, token]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (formData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      await authAPI.resetPassword({
        token,
        newPassword: formData.newPassword,
      });
      setIsSuccess(true);
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/account/login');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please try again.');
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
                Your password has been reset successfully! Redirecting to login...
              </div>
            </div>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <h2 className={styles.formTitle}>Set new password</h2>
            <p className={styles.formDescription}>
              Please enter your new password below.
            </p>

            {error && (
              <div className={styles.errorAlert}>
                <div className={styles.errorText}>{error}</div>
              </div>
            )}

            <div className={styles.inputGroup}>
              <div>
                <label htmlFor="newPassword" className={styles.visuallyHidden}>
                  New Password
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  className={`${styles.input} ${styles.inputTop}`}
                  placeholder="New password"
                  value={formData.newPassword}
                  onChange={handleChange}
                  disabled={!token}
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className={styles.visuallyHidden}>
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  className={`${styles.input} ${styles.inputBottom}`}
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={!token}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading || !token}
                className={styles.submitButton}
              >
                {isLoading ? 'Resetting password...' : 'Reset password'}
              </button>
            </div>

            <div className={styles.registerLink}>
              <Link href="/account/forgot-password">
                Request a new reset link
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

export default ResetPassword;
