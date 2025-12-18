import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { ApolloProvider } from '@apollo/client';
import '../styles/globals.css';
import useAuthStore from '../store/authStore'
import Layout from '../components/Layout'
import { NotificationProvider } from '../contexts/NotificationContext';
import SeoHead from '../components/SeoHead';
import apolloClient from '../lib/apolloClient';

// Pages that don't require authentication
const publicPages = ['/account/login', '/account/register', '/account/forgot-password', '/account/reset-password'];

// Pages that don't use the main layout
const noLayoutPages = ['/account/login', '/account/register', '/account/forgot-password', '/account/reset-password'];



function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const hydrate = useAuthStore((state) => state.hydrate);
  const userRole = useAuthStore((state) => state.user?.role);
  const hasUser = useAuthStore((state) => Boolean(state.user));

  // Hydrate auth state from localStorage on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Handle authentication routing
  useEffect(() => {
    // Wait for hydration to complete before redirecting
    if (!isHydrated) return;

    const isPublicPage = publicPages.includes(router.pathname);

    if (!isAuthenticated && !isPublicPage) {
      router.push('/account/login');
    }
  }, [isAuthenticated, isHydrated, router.pathname]);

  // Restrict admin routes to admin role only
  useEffect(() => {
    if (!isHydrated || !isAuthenticated || !hasUser) return;

    const isAdminRoute = router.pathname.startsWith('/admin');
    if (isAdminRoute && userRole !== 'admin') {
      router.replace('/');
    }
  }, [isHydrated, isAuthenticated, hasUser, userRole, router.pathname]);

  const useLayout = !noLayoutPages.includes(router.pathname);

  const pageContent = useLayout && isAuthenticated ? (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  ) : (
    <Component {...pageProps} />
  );

  return (
    <ApolloProvider client={apolloClient}>
      <SeoHead />
      <NotificationProvider>
        {pageContent}
      </NotificationProvider>
    </ApolloProvider>
  );
}

export default MyApp;
