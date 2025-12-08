const getFullName = user => {
  if(!user) return ""
  if(user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`
  else if(user.first_name) return user.first_name
  else if(user.username) return user.username
  else return ""
}

const capitalize = str => {
  if (typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
const capitalizeEachWord = str => {
  if (typeof str !== 'string') return '';
  return str.split(' ').map(word => capitalize(word)).join(' ');
}

 const formatDate = (dateString) => {
  console.log("Date String:", dateString);
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return '—';
    }
  };

  const formatFullName = (user) => {
    if (user.first_name || user.last_name) {
      return `${capitalize(user.first_name || '')} ${capitalize(user.last_name || '')}`.trim();
    }
    return user.username;
  };

  const getInitials = (user) => {
    const name = formatFullName(user);
    const parts = name.split(' ').filter(Boolean);
    if (parts.length === 0) return user.username.slice(0, 2).toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  };

  const parseGid = (gidString) => {
    if (typeof gidString !== 'string') return null;
    const parts = gidString.split('/');
    const idPart = parts[parts.length - 1];
    const idInt = parseInt(idPart, 10);
    return isNaN(idInt) ? null : idInt;
  }

export { capitalize, capitalizeEachWord, getFullName, formatDate, formatFullName, getInitials, parseGid };