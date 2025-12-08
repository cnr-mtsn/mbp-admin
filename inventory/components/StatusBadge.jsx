import React from 'react';
import Badge from './ui/Badge';

export default function StatusBadge({ status }) {
  const variantMap = {
    'available': 'success',
    'checked-out': 'gray',
    'depleted': 'danger'
  };

  const labelMap = {
    'available': 'Available',
    'checked-out': 'Checked Out',
    'depleted': 'Depleted'
  };

  return (
    <Badge variant={variantMap[status] || 'gray'}>
      {labelMap[status] || status}
    </Badge>
  );
}
