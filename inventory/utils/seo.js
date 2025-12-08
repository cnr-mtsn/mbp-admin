import { capitalizeEachWord } from './helpers';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/my-checkouts': 'My Checkouts',
  '/admin/checkouts': 'All Checkouts',
  '/admin/users': 'User Management',
  '/add-product': 'Add Product',
  '/transactions': "Today's Transactions",
  '/account/login': 'Login',
  '/account/register': 'Create Account',
  '/account/profile': 'Profile',
};

const DEFAULT_TITLE = 'Paint Inventory';

const resolvePageTitle = (pathname, query = {}) => {
  if (pathname.startsWith('/inventory')) {
    if (query.view) return `${capitalizeEachWord(query.view.replace('-', ' '))} Inventory`;
    return 'Inventory';
  }
  if (pathname.startsWith('/product')) {
    return 'Product Details';
  }
  if (pathname.startsWith('/admin')) {
    return PAGE_TITLES[pathname] || 'Admin';
  }
  return PAGE_TITLES[pathname] || DEFAULT_TITLE;
};

export { resolvePageTitle, DEFAULT_TITLE, PAGE_TITLES };
