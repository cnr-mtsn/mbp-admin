import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { authAPI } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import styles from '../../styles/login.module.css';

function VerifyEmail() {
  const router = useRouter();
  const { token } = router.query;
  const { hydrate } = useAuthStore();

  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if token exists in URL
    if (router.isReady && !token) {
      setError('Invalid verification link. Please request a new verification email.');
      return;
    }

    // Auto-verify when token is available
    if (router.isReady && token && !isVerifying && !isSuccess && !error) {
      handleVerify();
    }
  }, [router.isReady, token]);

  const handleVerify = async () => {
    setIsVerifying(true);
    setError('');

    try {
      await authAPI.verifyEmail(token);
      setIsSuccess(true);

      // Refresh user data in store
      hydrate();

      // Redirect to home after 2 seconds
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to verify email. The link may have expired.');
    } finally {
      setIsVerifying(false);
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
        <div className={styles.form}>
          <h2 className={styles.formTitle}>Email Verification</h2>

          {isVerifying && (
            <div className={styles.infoAlert}>
              <div className={styles.infoText}>
                Verifying your email address...
              </div>
            </div>
          )}

          {isSuccess && (
            <div className={styles.successAlert}>
              <div className={styles.successText}>
                Your email has been verified successfully! Redirecting you to the dashboard...
              </div>
            </div>
          )}

          {error && (
            <div className={styles.errorAlert}>
              <div className={styles.errorText}>{error}</div>
            </div>
          )}

          {!isVerifying && !isSuccess && (
            <div className={styles.registerLink}>
              <Link href="/">
                Return to home
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}

export default VerifyEmail;
