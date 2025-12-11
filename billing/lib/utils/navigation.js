import Icon from "../../components/ui/Icon"

const isActivePath = (pathname, target) => {
  if (target === '/') {
    return pathname === target;
  }
  return pathname.startsWith(target);
};

const buildNavLinks = (user) => {
  const baseLinks = [
    {
      href: '/',
      label: 'Dashboard',
      icon: <Icon name="home" />,
    },
    {
      href: '/customers',
      label: 'Customers',
      icon: <Icon name="users" />
    },
    {
      href: '/estimates',
      label: 'Estimates',
      icon: <Icon name="document" />
    },
    {
      href: '/jobs',
      label: 'Jobs',
      icon: <Icon name="briefcase" />
    },
    {
      href: '/invoices',
      label: 'Invoices',
      icon: <Icon name="document-2" />
    },
    {
      href: '/expenses',
      label: 'Expenses',
      icon: <Icon name="money" />
    },
  ];

  return baseLinks;
};

export { isActivePath, buildNavLinks };
