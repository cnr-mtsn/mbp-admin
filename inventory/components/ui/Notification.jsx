import React from 'react';

export default function Notification({ notification, onClose }) {
  if (!notification?.message) return null;

  const { message, type = 'info' } = notification;

  return (
    <div className={`notification notification-${type}`}>
      <div className="notification-content">
        <span>{message}</span>
        <button
          type="button"
          className="notification-close"
          aria-label="Dismiss notification"
          onClick={onClose}
        >
          &times;
        </button>
      </div>
    </div>
  );
}
