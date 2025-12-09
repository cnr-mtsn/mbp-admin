import Head from 'next/head';
import { useRouter } from 'next/router'
import { useMemo } from 'react'
import { resolvePageTitle } from '../lib/utils/seo';

const SITE_NAME = 'Matson Bros Billing';
const SITE_DESCRIPTION = 'Professional billing and invoicing system for Matson Brothers Painting. Manage customers, estimates, jobs, and invoices in one place.';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://billing.matsonbrotherspainting.com';
const OG_IMAGE_PATH = '/og-image.png';

export default function SeoHead() {
  const router = useRouter();

  const pageTitle = useMemo(() => resolvePageTitle(router.pathname, router.query), [router.pathname, router.query]);
  const safeTitle = pageTitle || 'Billing';
  const fullTitle = `${safeTitle} | ${SITE_NAME}`;
  const canonicalUrl = `${SITE_URL}${router.asPath || ''}`;
  const ogImageUrl = `${SITE_URL}${OG_IMAGE_PATH}`;

  return (
    <Head>
      <title>{fullTitle}</title>
      <link rel="icon" href="/favicon.png" />
      <link rel="canonical" href={canonicalUrl} />
      <meta name="description" content={SITE_DESCRIPTION} />

      {/* iOS Home Screen Icons */}
      <link rel="apple-touch-icon" href="/logo.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="/logo.png" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="Matson Billing" />

      {/* Web App Manifest */}
      <link rel="manifest" href="/manifest.json" />
      <meta name="theme-color" content="#1e40af" />

      {/* Open Graph */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={SITE_DESCRIPTION} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImageUrl} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={SITE_DESCRIPTION} />
      <meta name="twitter:image" content={ogImageUrl} />
    </Head>
  );
}
