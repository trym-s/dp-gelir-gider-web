import React from 'react';
import './styles/LimitProgressBar.css'; // Stil dosyasını import et

const LimitProgressBar = ({ usagePercentage }) => {
  const getBarColor = () => {
    if (usagePercentage > 90) return 'progress-bar-danger';
    if (usagePercentage > 70) return 'progress-bar-warning';
    return 'progress-bar-safe';
  };

  const percentage = Math.min(usagePercentage, 100); // Yüzde 100'ü geçmemesini sağla

  return (
    <div className="progress-container">
      <div className={`progress-bar ${getBarColor()}`} style={{ width: `${percentage}%` }}></div>
    </div>
  );
};

export default LimitProgressBar;
