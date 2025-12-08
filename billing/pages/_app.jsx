import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { ApolloProvider } from '@apollo/client';
import apolloClient from '../lib/apolloClient';
import Layout from '../components/Layout';
import '../styles/globals.css';

// Pages that don't require authentication
const publicPages = ['/login'];

// Pages that don't use the main layout
const noLayoutPages = ['/login'];

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  // Sync dark mode with system preference
  // useEffect(() => {
  //   const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  //   const updateDarkMode = (e) => {
  //     if (e.matches) {
  //       document.documentElement.classList.add('dark');
  //     } else {
  //       document.documentElement.classList.remove('dark');
  //     }
  //   };

  //   // Set initial state
  //   updateDarkMode(mediaQuery);

  //   // Listen for changes
  //   mediaQuery.addEventListener('change', updateDarkMode);

  //   return () => mediaQuery.removeEventListener('change', updateDarkMode);
  // }, []);

  // Handle authentication routing
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const isPublicPage = publicPages.includes(router.pathname);

    if (!token && !isPublicPage) {
      router.push('/login');
    }

    if (token && router.pathname === '/login') {
      router.push('/');
    }
  }, [router.pathname]);

  const useLayout = !noLayoutPages.includes(router.pathname);

  const pageContent = useLayout ? (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  ) : (
    <Component {...pageProps} />
  );

  return (
    <ApolloProvider client={apolloClient}>
      {pageContent}
    </ApolloProvider>
  );
}

export default MyApp;
