import { capitalizeEachWord } from './helpers';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/customers': 'Customers',
  '/estimates': 'Estimates',
  '/jobs': 'Jobs',
  '/invoices': 'Invoices',
  '/account/login': 'Login',
  '/account/register': 'Create Account',
  '/account/profile': 'Profile',
};

const DEFAULT_TITLE = 'Billing';

const resolvePageTitle = (pathname, query = {}) => {
  // Customer detail page
  if (pathname.startsWith('/customers/') && pathname !== '/customers') {
    return 'Customer Details';
  }

  // Estimate detail page
  if (pathname.startsWith('/estimates/') && pathname !== '/estimates') {
    return 'Estimate Details';
  }

  // Job detail page
  if (pathname.startsWith('/jobs/') && pathname !== '/jobs') {
    return 'Job Details';
  }

  // Invoice detail page
  if (pathname.startsWith('/invoices/') && pathname !== '/invoices') {
    return 'Invoice Details';
  }

  // New/Create pages
  if (pathname.includes('/new')) {
    if (pathname.includes('customer')) return 'New Customer';
    if (pathname.includes('estimate')) return 'New Estimate';
    if (pathname.includes('job')) return 'New Job';
    if (pathname.includes('invoice')) return 'New Invoice';
  }

  return PAGE_TITLES[pathname] || DEFAULT_TITLE;
};

export { resolvePageTitle, DEFAULT_TITLE, PAGE_TITLES };
