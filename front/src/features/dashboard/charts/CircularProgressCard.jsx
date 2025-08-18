
import React, { useState, useEffect } from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { formatCurrency } from '../summary/helpers';

/**
 * @param {string} currency - ISO currency code (e.g., 'TRY', 'USD', ...)
 */
const CircularProgressCard = ({ title, percentage, text, amount, color, onClick, currency = 'TRY' }) => {  
  const [displayPercentage, setDisplayPercentage] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setDisplayPercentage(percentage || 0), 100);
    return () => clearTimeout(timer);
  }, [percentage]);

  return (
    <div className="progress-card" onClick={onClick}>
      <div className="progress-bar-wrapper">
        <CircularProgressbar
          value={displayPercentage}
          text={text}
          strokeWidth={10}
          classNames={{ text: 'progress-bar-text' }}
          styles={buildStyles({
            rotation: 0.25,
            strokeLinecap: 'butt',
            textSize: '22px',
            pathTransitionDuration: 0.8,
            pathColor: `var(--${color})`,
            textColor: `var(--${color})`,
            trailColor: 'var(--border-color-dark)',
            backgroundColor: 'var(--primary-color)',
          })}
        />
      </div>
      <h3 className="progress-card-title">{title}</h3>
      <p className="progress-card-amount">{formatCurrency(amount, currency)}</p>
    </div>
  );
};

export default CircularProgressCard;

