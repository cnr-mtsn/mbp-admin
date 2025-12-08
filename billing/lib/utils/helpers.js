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