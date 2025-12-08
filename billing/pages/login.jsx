import { useState } from 'react';
import { useRouter } from 'next/router';
import { useMutation } from '@apollo/client';
import { LOGIN } from '../lib/graphql/mutations';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const [loginMutation, { loading }] = useMutation(LOGIN, {
    onCompleted: (data) => {
      if (data.login) {
        localStorage.setItem('token', data.login.token);
        localStorage.setItem('user', JSON.stringify(data.login.user));
        router.push('/');
      }
    },
    onError: (error) => {
      setError(error.message || 'Login failed');
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await loginMutation({
        variables: { username, password },
      });
    } catch (err) {
      // Error handled in onError
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 px-4">
      <div className="card max-w-md w-full">
        <div className="flex flex-col items-center gap-2 mb-6">
          <img src="/long-logo-no-bg.png" alt="Matson Brothers Painting" className="h-10 w-auto" />
          <p className="muted text-sm">Billing Console</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 w-full">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium muted mb-2" htmlFor="username">
              Username
            </label>
            <input
              type="text"
              id="username"
              className="input-field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium muted mb-2" htmlFor="password">
              Password
            </label>
            <input
              type="password"
              id="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
