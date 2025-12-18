import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../../styles/login.module.css';
import { useAuthStore } from '../../store/authStore'

function Login() {
  const router = useRouter();
  const { login, isLoading, error } = useAuthStore();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(formData);
    if (result.success) {
      router.push('/');
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
        <form className={styles.form} onSubmit={handleSubmit}>
          {error && (
            <div className={styles.errorAlert}>
              <div className={styles.errorText}>{error}</div>
            </div>
          )}
          <div className={styles.inputGroup}>
            <div>
              <label htmlFor="username" className={styles.visuallyHidden}>
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className={`${styles.input} ${styles.inputTop}`}
                placeholder="Username"
                value={formData.username}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="password" className={styles.visuallyHidden}>
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className={`${styles.input} ${styles.inputBottom}`}
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className={styles.forgotPasswordLink}>
            <Link href="/account/forgot-password">
              Forgot your password?
            </Link>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={styles.submitButton}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className={styles.registerLink}>
            <Link href="/account/register">
              Don't have an account? Register
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}

export default Login;
