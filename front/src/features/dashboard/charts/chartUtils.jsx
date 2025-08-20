
import { formatCurrency as baseFormatCurrency } from "../summary/helpers";
import React from 'react';

/* ---------------------------------------
 * Labels
 * ------------------------------------- */
export const LABELS = {
  paid: "Paid",
  received: "Received",
  remaining: "Remaining",
  total: "Total",
  noData: "No data to display.",
};

/* ---------------------------------------
 * CSS vars & colors
 * ------------------------------------- */
const cssVar = (name, fallback) => `var(${name}${fallback ? `, ${fallback}` : ""})`;

export const MODERN_COLORS = {
  income: cssVar("--success-color", "#22c55e"),
  expense: cssVar("--expense-color", "#2563eb"),
  incomeRemaining: cssVar("--warning-color", "#f59e0b"),
  expenseRemaining: cssVar("--error-color", "#ef4444"),
  difference: cssVar("--difference-color", "#a855f7"),
  neutral: cssVar("--neutral-color", "#94a3b8"),
  bgCard: cssVar("--surface-color", "rgba(255,255,255,0.9)"),
  border: cssVar("--border-color-light-alt", "rgba(148,163,184,0.25)"),
  shadow: cssVar("--shadow-color-10", "rgba(0,0,0,0.1)"),
  text: cssVar("--text-color", "#0f172a"),
  textDim: cssVar("--text-dim-color", "#475569"),
  white90: cssVar("--white-color-90", "rgba(255,255,255,0.9)"),
};

export const INCOME_PALETTE = [
  cssVar("--income-palette-1", "#16a34a"),
  cssVar("--income-palette-2", "#22c55e"),
  cssVar("--income-palette-3", "#4ade80"),
  cssVar("--income-palette-4", "#86efac"),
];

export const EXPENSE_PALETTE = [
  cssVar("--expense-palette-1", "#1d4ed8"),
  cssVar("--expense-palette-2", "#2563eb"),
  cssVar("--expense-palette-3", "#60a5fa"),
  cssVar("--expense-palette-4", "#93c5fd"),
];

/* ---------------------------------------
 * Formatting
 * ------------------------------------- */
export const formatCurrency = (value, currency = 'TRY', locale = 'tr-TR') =>
  baseFormatCurrency(value, currency, locale);

export const formatPercent = (value, total) => {
  const v = Number(value ?? 0);
  const t = Number(total ?? 0);
  if (t <= 0) return "0%";
  const pct = (v / t) * 100;
  return `${pct.toFixed(pct < 1 ? 1 : pct < 10 ? 1 : 0)}%`;
};

export const safeNumber = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Axis-friendly compact money, with symbol */
export const formatAxisCurrency = (value, currency = 'TRY', locale = 'tr-TR') => {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value ?? 0);
  } catch {
    return `${Number(value ?? 0).toLocaleString(locale)} ${currency}`;
  }
};

/* ---------------------------------------
 * Legend helpers
 * ------------------------------------- */
export const buildLegendPayload = (items) =>
  items.map(({ name, color, type = "rect", id }) => ({
    id: id || `legend-${name}`,
    value: name,
    color,
    type,
  }));

/* ---------------------------------------
 * Color utils
 * ------------------------------------- */
export const mixWith = (base, other = "#000", ratio = 15) =>
  `color-mix(in oklab, ${base} ${ratio}%, ${other})`;

export const withOpacity = (base, alpha = 0.2) =>
  `color-mix(in oklab, ${base} ${Math.round((1 - alpha) * 100)}%, transparent)`;

/* ---------------------------------------
 * Tooltip (currency-aware)
 * ------------------------------------- */
export const CustomTooltip = ({ active, payload, label, currency = 'TRY' }) => {
  if (!active || !payload || !payload.length) return null;

  const groups = {
    paid: { value: 0, color: null, label: LABELS.paid },
    received: { value: 0, color: null, label: LABELS.received },
    remaining: { value: 0, color: MODERN_COLORS.neutral, label: LABELS.remaining },
    other: {}, // dataKey -> {color, name, value}
  };

  payload.forEach((p) => {
    const k = String(p.dataKey || "");
    const v = safeNumber(p.value);
    const color = p.fill || p.color || MODERN_COLORS.neutral;

    if (k.startsWith("paid")) {
      groups.paid.value += v; groups.paid.color = groups.paid.color || color;
    } else if (k.startsWith("received")) {
      groups.received.value += v; groups.received.color = groups.received.color || color;
    } else if (k.startsWith("remaining")) {
      groups.remaining.value += v; groups.remaining.color = color;
    } else {
      const name = p.name || k;
      if (!groups.other[k]) groups.other[k] = { color, name, value: 0 };
      groups.other[k].value += v;
    }
  });

  const rows = [];
  const hasPaid = payload.some(p => String(p.dataKey || "").startsWith("paid"));
  const hasRecv = payload.some(p => String(p.dataKey || "").startsWith("received"));
  const hasRem  = payload.some(p => String(p.dataKey || "").startsWith("remaining"));

  if (groups.paid.value > 0 || hasPaid) rows.push({ name: LABELS.paid, value: groups.paid.value, color: groups.paid.color || MODERN_COLORS.expense });
  if (groups.received.value > 0 || hasRecv) rows.push({ name: LABELS.received, value: groups.received.value, color: groups.received.color || MODERN_COLORS.income });
  if (groups.remaining.value > 0 || hasRem) rows.push({ name: LABELS.remaining, value: groups.remaining.value, color: groups.remaining.color || MODERN_COLORS.neutral });
  Object.values(groups.other).forEach((o) => rows.push(o));

  const nonZero = rows.filter((r) => r.value !== 0);
  const display = nonZero.length ? nonZero : rows.length ? [rows[0]] : [];
  const total = rows.reduce((s, r) => s + safeNumber(r.value), 0);

  return (
    <div
      style={{
        backgroundColor: MODERN_COLORS.white90,
        border: `1px solid ${MODERN_COLORS.border}`,
        borderRadius: 10,
        padding: 12,
        boxShadow: `0 8px 24px ${MODERN_COLORS.shadow}`,
        fontSize: 13,
        fontFamily: "Inter, ui-sans-serif, system-ui, Segoe UI, Roboto, Helvetica, Arial",
        maxWidth: 320,
        backdropFilter: "blur(4px)",
      }}
    >
      {label && (
        <div style={{ marginBottom: 8, fontWeight: 700, color: MODERN_COLORS.text, lineHeight: 1.1 }}>
          {label}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: 6, alignItems: "center" }}>
        {display.map((row, idx) => (
          <React.Fragment key={idx}>
            <div style={{ width: 10, height: 10, borderRadius: 999, background: row.color || MODERN_COLORS.neutral }} />
            <div style={{ color: MODERN_COLORS.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {row.name}
            </div>
            <div style={{ textAlign: "right", color: MODERN_COLORS.text }}>
              {formatCurrency(row.value, currency)}
            </div>
            <div style={{ textAlign: "right", color: MODERN_COLORS.textDim, minWidth: 48 }}>
              {formatPercent(row.value, total)}
            </div>
          </React.Fragment>
        ))}
      </div>
      {total > 0 && (
        <div
          style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: `1px dashed ${withOpacity(MODERN_COLORS.border, 0.4)}`,
            display: "flex",
            gap: 8,
            justifyContent: "space-between",
            color: MODERN_COLORS.text,
            fontWeight: 600,
          }}
        >
          <span>{LABELS.total}</span>
          <span>{formatCurrency(total, currency)}</span>
        </div>
      )}
    </div>
  );
};

/* Re-exports for convenience */
export { cssVar };

