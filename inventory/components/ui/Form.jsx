import React from 'react';
import styles from '../../styles/form.module.css';

export function FormGroup({ children, className = '' }) {
  return (
    <div className={`form-group ${className}`}>
      {children}
    </div>
  );
}

export function FormLabel({ children, htmlFor, required, className = '' }) {
  return (
    <label htmlFor={htmlFor} className={`form-label ${className}`}>
      {children}
      {required && ' *'}
    </label>
  );
}

export function FormInput({
  type = 'text',
  id,
  name,
  value,
  onChange,
  placeholder,
  required,
  readOnly,
  min,
  max,
  step,
  className = ''
}) {
  return (
    <input
      type={type}
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      readOnly={readOnly}
      min={min}
      max={max}
      step={step}
      className={`form-input ${className}`}
    />
  );
}

export function FormSelect({
  id,
  name,
  value,
  onChange,
  required,
  disabled = false,
  children,
  className = ''
}) {
  return (
    <select
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      className={`form-select ${className}`}
      disabled={disabled}
    >
      {children}
    </select>
  );
}

export function FormHelper({ children, className = '' }) {
  return (
    <span className={`form-helper ${className}`}>
      {children}
    </span>
  );
}

export function FormCheckbox({
  id,
  checked,
  onChange,
  label,
  description,
  className = ''
}) {
  return (
    <div className={`${styles.checkboxContainer} ${className}`}>
      <div className={styles.checkboxWrapper}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="form-checkbox"
        />
      </div>
      {(label || description) && (
        <div className={styles.checkboxLabel}>
          {label && (
            <label htmlFor={id} className={styles.checkboxLabelText}>
              {label}
            </label>
          )}
          {description && (
            <p className={styles.checkboxDescription}>
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
