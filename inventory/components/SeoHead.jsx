import Head from 'next/head';
import { useRouter } from 'next/router'
import { useMemo } from 'react'
import { resolvePageTitle } from '../utils/seo';

const SITE_NAME = 'Matson Bros Inventory';
const SITE_DESCRIPTION = 'Transform paint operations with QR check-ins, real-time availability dashboards, automated low-stock alerts, secure employee tracking, and enterprise-grade analytics in a single inventory platform.';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://inventory.matsonbrotherspainting.com';
const OG_IMAGE_PATH = '/og-image.png';

export default function SeoHead() {
  const router = useRouter();
  
  const pageTitle = useMemo(() => resolvePageTitle(router.pathname, router.query), [router.pathname, router.query]);
  const safeTitle = pageTitle || 'Paint Inventory';
  const fullTitle = `${safeTitle} | ${SITE_NAME}`;
  const canonicalUrl = `${SITE_URL}${router.asPath || ''}`;
  const ogImageUrl = `${SITE_URL}${OG_IMAGE_PATH}`;

  return (
    <Head>
      <title>{fullTitle}</title>
      <link rel="icon" href="/favicon.png" />
      <link rel="canonical" href={canonicalUrl} />
      <meta name="description" content={SITE_DESCRIPTION} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={SITE_DESCRIPTION} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImageUrl} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={SITE_DESCRIPTION} />
      <meta name="twitter:image" content={ogImageUrl} />
    </Head>
  );
}
