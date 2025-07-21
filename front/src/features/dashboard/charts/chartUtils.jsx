import { formatCurrency } from "../summary/helpers";

// Colors derived from the root CSS variables for consistency
export const MODERN_COLORS = {
  income: 'var(--success-color)',
  expense: 'var(--expense-color)',
  incomeRemaining: 'var(--warning-color)',
  expenseRemaining: 'var(--error-color)',
  difference: 'var(--difference-color)',
  neutral: 'var(--neutral-color)',
};

// Palettes for distribution charts derived from the base colors
export const INCOME_PALETTE = ['var(--income-palette-1)', 'var(--income-palette-2)', 'var(--income-palette-3)', 'var(--income-palette-4)']; // Shades of Green
export const EXPENSE_PALETTE = ['var(--expense-palette-1)', 'var(--expense-palette-2)', 'var(--expense-palette-3)', 'var(--expense-palette-4)']; // Shades of Blue



// Custom Tooltip for Recharts
export const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const finalPayload = [];
    const processedKeys = new Set();

    // Group and sum paid values
    const paidPayload = payload.filter(p => p.dataKey.startsWith('paid'));
    if (paidPayload.length > 0) {
      const totalPaid = paidPayload.reduce((sum, p) => sum + p.value, 0);
      finalPayload.push({ ...paidPayload[0], value: totalPaid, name: 'Ödenen' });
      paidPayload.forEach(p => processedKeys.add(p.dataKey));
    }

    // Group and sum received values
    const receivedPayload = payload.filter(p => p.dataKey.startsWith('received'));
    if (receivedPayload.length > 0) {
      const totalReceived = receivedPayload.reduce((sum, p) => sum + p.value, 0);
      finalPayload.push({ ...receivedPayload[0], value: totalReceived, name: 'Alınan' });
      receivedPayload.forEach(p => processedKeys.add(p.dataKey));
    }

    // Add remaining items that were not processed
    payload.forEach(p => {
      if (!processedKeys.has(p.dataKey)) {
        finalPayload.push(p);
      }
    });
    
    // Filter out items with zero value, unless all are zero
    const nonZeroPayload = finalPayload.filter(p => p.value !== 0);
    const displayPayload = nonZeroPayload.length > 0 ? nonZeroPayload : finalPayload.slice(0, 1);


    return (
      <div
        style={{
          backgroundColor: 'var(--white-color-90)',
          border: '1px solid var(--border-color-light-alt)',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 12px var(--shadow-color-10)',
          fontSize: '14px',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <p style={{ margin: 0, marginBottom: '8px', fontWeight: '600' }}>{label}</p>
        {displayPayload.map((pld, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <div style={{ width: '10px', height: '10px', backgroundColor: pld.fill || pld.color, borderRadius: '50%', marginRight: '8px' }}></div>
            <span style={{ flex: 1 }}>{`${pld.name}:`}</span>
            <span style={{ fontWeight: '600' }}>{formatCurrency(pld.value)}</span>
          </div>
        ))}
      </div>
    );
  }

  return null;
};
