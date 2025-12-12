export const formatDate = dateString => {
    // sometimes dateString is a string, sometimes it's an integer timestamp
    // we need to parse the string to an integer before running new Date()
    const date = new Date(
        typeof dateString === 'string' ? parseInt(dateString, 10) : dateString
    );
    return date.toLocaleDateString("en-US", {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export const formatTime = (date) => {
  if (!date) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};


export const formatMoney = amount => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
}

const capitalize = str => {
  if (typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export const capitalizeEachWord = str => {
  if (typeof str !== 'string') return '';
  return str.split(' ').map(word => capitalize(word)).join(' ');
}

export const getFullName = user => {
  if(!user) return ""
  if(user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`
  else if(user.first_name) return user.first_name
  else if(user.username) return user.username
  else if(user.name) return user.name
  else return ""
}

export const formatFullName = (user) => {
  if(!user) return "";
  if (user.first_name || user.last_name) {
    return `${capitalize(user.first_name || '')} ${capitalize(user.last_name || '')}`.trim();
  }
  return user.username || user.name || '';
};

export const getInitials = (user) => {
  if(!user) return "";
  const name = formatFullName(user);
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return (user.username || user.name || '').slice(0, 2).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

export const formatStatus = (status) => {
  if (!status) return '';
  return status.replace(/_/g, ' ');
};

export const RESULTS_PER_PAGE = {
  invoices: parseInt(process.env.NEXT_PUBLIC_INVOICES_PER_PAGE) || 25,
  jobs: parseInt(process.env.NEXT_PUBLIC_JOBS_PER_PAGE) || 25,
  expenses: parseInt(process.env.NEXT_PUBLIC_EXPENSES_PER_PAGE) || 100
}

export const formatExpenseDescription = description => {
  if(!description) return "";
  if(typeof description !== 'string') return "";
  if(description?.includes("I 0 ")) return description.replaceAll("I 0 ", ""); 
  return description;
}

export const formatCustomerName = (customer, fallback = 'No customer') => {
  if (!customer) return fallback;
  const companyName = typeof customer.company_name === 'string' ? customer.company_name.trim() : '';
  if (companyName) return companyName;

  const name = typeof customer.name === 'string' ? customer.name.trim() : '';
  return name || fallback;
};
