import React from 'react';
import Button from './Button';

export default function ConfirmDialog({ open, title = 'Confirm', message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div style={overlayStyle} role="alertdialog" aria-modal="true">
      <div style={dialogStyle}>
        <div style={headerStyle}>{title}</div>
        <div style={bodyStyle}>{message}</div>
        <div style={actionsStyle}>
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(17, 24, 39, 0.35)',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '8vh 1rem 2rem'
};

const dialogStyle = {
  background: 'var(--color-white)',
  borderRadius: '10px',
  boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
  width: '100%',
  maxWidth: '420px',
  border: '1px solid var(--color-gray-200)'
};

const headerStyle = {
  padding: '1rem 1.25rem',
  borderBottom: '1px solid var(--color-gray-200)',
  fontWeight: '600',
  color: 'var(--color-gray-900)'
};

const bodyStyle = {
  padding: '1rem 1.25rem',
  color: 'var(--color-gray-700)',
  lineHeight: 1.5
};

const actionsStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '0.5rem',
  padding: '0.75rem 1.25rem',
  borderTop: '1px solid var(--color-gray-200)'
};
