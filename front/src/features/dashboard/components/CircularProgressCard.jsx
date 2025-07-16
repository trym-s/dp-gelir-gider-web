import React, { useState, useEffect } from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

/**
 * A reusable card component to display a value with a circular progress bar.
 * @param {object} props - The properties for the component.
 * @param {string} props.title - The title to display on the card.
 * @param {number} props.percentage - The percentage value for the progress bar (0-100).
 * @param {string} props.text - The text to display inside the progress bar (e.g., percentage).
 * @param {number} props.amount - The currency amount to display below the title.
 * @param {string} props.color - The color for the progress bar path and text.
 * @returns {JSX.Element}
 */
const CircularProgressCard = ({ title, percentage, text, amount, color, onClick }) => {  
  const [displayPercentage, setDisplayPercentage] = useState(0);

  useEffect(() => {
    // percentage prop'u değiştiğinde animasyonu tetikle
    const timer = setTimeout(() => {
      setDisplayPercentage(percentage || 0);
    }, 100); // Animasyonun başlaması için küçük bir gecikme

    return () => clearTimeout(timer);
  }, [percentage]); // 'percentage' bağımlılık dizisine eklendi

  const formatCurrency = (value) => {
    if (value == null) return "0,00 ₺";
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
  };

  return (
    <div className="progress-card" onClick={onClick}>
      <div className="progress-bar-wrapper">
        <CircularProgressbar
          value={displayPercentage}
          text={text}
          styles={buildStyles({
            // Rotation of path and trail, in number of turns (0-1)
            rotation: 0.25,

            // Whether to use rounded or flat corners on the ends - can use 'butt' or 'round'
            strokeLinecap: 'butt',

            // Text size
            textSize: '16px',

            // How long animation takes to go from one percentage to another, in seconds
            pathTransitionDuration: 0.8,

            // Colors
            pathColor: `var(--${color})`,
            textColor: `var(--${color})`,
            trailColor: 'var(--border-color-dark)',
            backgroundColor: 'var(--primary-color)',
          })}
        />
      </div>
      <h3 className="progress-card-title">{title}</h3>
      <p className="progress-card-amount">{formatCurrency(amount)}</p>
    </div>
  );
};

export default CircularProgressCard;
