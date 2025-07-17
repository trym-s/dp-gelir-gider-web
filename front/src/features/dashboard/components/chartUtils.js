import { formatCurrency } from "./summary/helpers";

// A more muted, professional color palette
export const MODERN_COLORS = {
  income: '#4ade80',      // Softer Green
  expense: '#60a5fa',     // Softer Blue
  incomeMuted: '#86efac', // Lighter Green
  expenseMuted: '#93c5fd',// Lighter Blue
  remaining: '#fb923c',   // Softer Orange
  difference: '#f87171',  // Softer Red
  neutral: '#64748b',     // Slate 500
};

// Palettes for distribution charts (Pie/Donut) with muted tones
export const INCOME_PALETTE = ['#4ade80', '#86efac', '#bbf7d0', '#dcfce7'];
export const EXPENSE_PALETTE = ['#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'];


// Custom Tooltip for Recharts
export const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          fontSize: '14px',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <p style={{ margin: 0, marginBottom: '8px', fontWeight: '600' }}>{label}</p>
        {payload.map((pld, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <div style={{ width: '10px', height: '10px', backgroundColor: pld.color, borderRadius: '50%', marginRight: '8px' }}></div>
            <span style={{ flex: 1 }}>{`${pld.name}:`}</span>
            <span style={{ fontWeight: '600' }}>{formatCurrency(pld.value)}</span>
          </div>
        ))}
      </div>
    );
  }

  return null;
};
