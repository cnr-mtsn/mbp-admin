import { useState, useRef, useEffect } from 'react';
import styles from '../../styles/searchableSelect.module.css';

export default function SearchableSelect({
  id,
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Search...',
  filterFn,
  emptyMessage = 'No results found'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Find the selected option
  const selectedOption = options.find(opt => opt.value === value);

  // Default filter function if none provided
  const defaultFilter = (option, query) => {
    const searchLower = query.toLowerCase();
    return (
      option.label?.toLowerCase().includes(searchLower) ||
      option.secondary?.toLowerCase().includes(searchLower)
    );
  };

  const filterFunction = filterFn || defaultFilter;

  // Filter options based on search query
  const filteredOptions = searchQuery
    ? options.filter(opt => filterFunction(opt, searchQuery))
    : options;

  // Handle outside clicks
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  // Handle keyboard events
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchQuery('');
      inputRef.current?.blur();
    }
  };

  const handleInputFocus = () => {
    if (!isOpen) {
      setIsOpen(true);
      setSearchQuery('');
    }
  };

  const handleSearchChange = (e) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleOptionClick = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchQuery('');
    inputRef.current?.blur();
  };

  // Display value: show search query when open, selected label when closed
  const displayValue = isOpen ? searchQuery : (selectedOption?.label || '');

  return (
    <div className={styles.container} ref={containerRef}>
      <input
        ref={inputRef}
        type="text"
        id={id}
        name={name}
        className={styles.input}
        placeholder={placeholder}
        value={displayValue}
        onChange={handleSearchChange}
        onFocus={handleInputFocus}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />

      {isOpen && (
        <div key={`dropdown-${searchQuery}-${filteredOptions.length}`} className={styles.dropdown}>
          {searchQuery && (
            <div className={styles.searchInfo}>
              {filteredOptions.length} result{filteredOptions.length !== 1 ? 's' : ''}
            </div>
          )}
          {filteredOptions.length === 0 ? (
            <div className={styles.emptyState}>{emptyMessage}</div>
          ) : (
            filteredOptions.map((option, index) => (
              <div
                key={`${option.value}-${index}`}
                className={`${styles.option} ${
                  option.value === value ? styles.optionSelected : ''
                }`}
                onClick={() => handleOptionClick(option.value)}
              >
                <div className={styles.optionPrimary}>{option.label}</div>
                {option.secondary && (
                  <div className={styles.optionSecondary}>{option.secondary}</div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
