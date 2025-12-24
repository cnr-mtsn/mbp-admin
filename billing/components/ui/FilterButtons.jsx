export default function FilterButtons({
  filters,
  activeFilter,
  onFilterChange,
  getCount,
  labels = {},
  capitalize = true,
  multiSelect = false,
}) {
  const isFilterActive = (filter) => {
    if (!multiSelect) {
      return activeFilter === filter;
    }
    // Multi-select: check if filter is in comma-separated list
    if (activeFilter === 'all') {
      return filter === 'all';
    }
    return activeFilter.split(',').map(s => s.trim()).includes(filter);
  };

  const getDisplayText = (filter) => {
    const count = getCount(filter);
    const label = labels[filter] || filter.replace(/_/g, ' ');
    return `${label} (${count})`;
  };

  return (
    <div className="flex flex-wrap gap-3">
      {filters.map(filter => {
        const isActive = isFilterActive(filter);
        const classes = `${capitalize ? 'capitalize' : ''} ${isActive ? 'btn-primary' : 'btn-secondary'}`.trim();

        return (
          <button
            onClick={() => onFilterChange(filter)}
            className={classes}
            key={`filter-${filter}`}
          >
            {getDisplayText(filter)}
          </button>
        );
      })}
    </div>
  );
}
