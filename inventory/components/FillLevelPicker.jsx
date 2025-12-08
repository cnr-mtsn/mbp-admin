import React, { useMemo } from 'react';

const containerGallonsMap = {
  '5 Gallon': 5,
  '5gal': 5,
  '5 gallon': 5,
  'Gallon': 1,
  '1 Gallon': 1,
  '1gal': 1,
  '1 gallon': 1,
  gallon: 1,
  'Quart': 0.25,
  '1 Quart': 0.25,
  '1qt': 0.25,
  quart: 0.25
};

const getContainerGallons = (containerSize) => {
  if (!containerSize) return null;
  const key = typeof containerSize === 'string' ? containerSize : '';
  return containerGallonsMap[key] ?? (key ? containerGallonsMap[key.toLowerCase()] : null) ?? null;
};

export default function FillLevelPicker({ value, onChange, containerSize }) {
  const sections = useMemo(() => Array.from({ length: 20 }), []);
  const normalized = Math.min(1, Math.max(0, parseFloat(value) || 0));
  const filledSections = Math.round(normalized * sections.length);
  const percent = Math.round(normalized * 100);
  const containerGallons = getContainerGallons(containerSize);
  const estimatedGallons = containerGallons != null
    ? (containerGallons * normalized).toFixed(2)
    : null;

  const handleClick = (index) => {
    const fillCount = sections.length - index;
    const newLevel = Math.max(0, Math.min(1, fillCount / sections.length));
    onChange(newLevel.toFixed(2));
  };
  const bucketWidth = 60;
  const bucketHeight = 150;

  return (
    <div style={{ display: 'flex', gap: '12px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: 'var(--color-gray-700)' }}>
        <div><strong>Fill:</strong> {percent}%</div>
        <div><strong>Container:</strong> {containerSize || 'Set container size'}</div>
        {estimatedGallons != null && (
          <div><strong>Estimated gallons:</strong> {estimatedGallons} gal</div>
        )}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateRows: 'repeat(20, 1fr)',
          width: bucketWidth,
          height: bucketHeight,
          border: '2px solid var(--color-gray-300)',
          borderRadius: '6px',
          overflow: 'hidden',
          cursor: 'pointer',
          boxShadow: '0 2px 6px rgba(0,0,0,0.08)'  
        }}
      >
        {sections.map((_, index) => {
          const isFilled = index >= sections.length - filledSections;
          return (
            <div
              key={index}
              onClick={() => handleClick(index)}
              style={{
                backgroundColor: isFilled ? 'var(--color-primary)' : 'var(--color-gray-100)',
                borderBottom: '1px solid var(--color-gray-200)',
                transition: 'background-color 120ms ease',
                position: 'relative'
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export { getContainerGallons };
