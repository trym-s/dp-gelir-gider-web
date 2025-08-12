import React from 'react';

export const RequiredLegend = ({ style }) => (
  <div style={{ fontSize: 12, color: 'var(--text-color-light,#8c8c8c)', margin: '8px 0', ...style }}>
    <span style={{ color: '#ff4d4f' }}>*</span> işaretli alanlar zorunludur.
  </div>
);
