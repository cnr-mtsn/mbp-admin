import React from 'react';

export default function Alert({ children, variant = 'success', className = '' }) {
  if (!children) return null;

  return (
    <div className={`alert alert-${variant} ${className}`}>
      {children}
    </div>
  );
}
