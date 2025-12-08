import React from 'react';

export default function Loading({ message = 'Loading...' }) {
  return (
    <div className="loading">
      {message}
    </div>
  );
}
