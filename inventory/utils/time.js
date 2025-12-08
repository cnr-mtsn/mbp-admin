const formatTime = (date) => {
  if (!date) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (date) => {
  if (!date) return '';
  return date.toLocaleDateString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

export { formatTime, formatDate };
