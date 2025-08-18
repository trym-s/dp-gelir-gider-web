// chartUtils.js
import { formatCurrency } from "../summary/helpers";

import React, { useEffect, useMemo, useState } from 'react';
/* ---------------------------------------
 * Labels (override from your components)
 * ------------------------------------- */
export const LABELS = {
  paid: "Paid",
  received: "Received",
  remaining: "Remaining",
  total: "Total",
  noData: "No data to display.",
};

/* ---------------------------------------
 * CSS variable helpers
 * ------------------------------------- */
const cssVar = (name, fallback) => `var(${name}${fallback ? `, ${fallback}` : ""})`;

/* ---------------------------------------
 * Modern color system (with fallbacks)
 * Keep raw CSS variables so themes can swap colors without code changes.
 * ------------------------------------- */
export const MODERN_COLORS = {
  income: cssVar("--success-color", "#22c55e"),
  expense: cssVar("--expense-color", "#2563eb"),
  incomeRemaining: cssVar("--warning-color", "#f59e0b"),
  expenseRemaining: cssVar("--error-color", "#ef4444"),
  difference: cssVar("--difference-color", "#a855f7"),
  neutral: cssVar("--neutral-color", "#94a3b8"),
  // neutrals
  bgCard: cssVar("--surface-color", "rgba(255,255,255,0.9)"),
  border: cssVar("--border-color-light-alt", "rgba(148,163,184,0.25)"),
  shadow: cssVar("--shadow-color-10", "rgba(0,0,0,0.1)"),
  text: cssVar("--text-color", "#0f172a"),
  textDim: cssVar("--text-dim-color", "#475569"),
  white90: cssVar("--white-color-90", "rgba(255,255,255,0.9)"),
};

/* ---------------------------------------
 * Palettes for pies (with CSS var fallbacks)
 * Provide at least 4 slots; component can modulo index.
 * ------------------------------------- */
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
 * Formatting utilities
 * ------------------------------------- */
export const formatPercent = (value, total) => {
  const v = Number(value ?? 0);
  const t = Number(total ?? 0);
  if (t <= 0) return "0%";
  const pct = (v / t) * 100;
  return `${pct.toFixed(pct < 1 ? 1 : pct < 10 ? 1 : 0)}%`;
};

export const safeNumber = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/* ---------------------------------------
 * Legend payload builder for Recharts <Legend payload=[...] />
 * ------------------------------------- */
export const buildLegendPayload = (items) =>
  items.map(({ name, color, type = "rect", id }) => ({
    id: id || `legend-${name}`,
    value: name,
    color,
    type,
  }));

/* ---------------------------------------
 * Labels for pie slices (single-line + compact money)
 * ------------------------------------- */
export const sliceLabelFormatter = ({ name, value, total }) => {
  const val = safeNumber(value);
  if (val <= 0) return "";
  const p = formatPercent(val, total);
  return `${name} • ${formatCurrency(val)} • ${p}`;
};

/* ---------------------------------------
 * Color utilities for subtle/hover states
 * (Use CSS color-mix so themes/dark-mode keep consistency)
 * ------------------------------------- */
export const mixWith = (base, other = "#000", ratio = 15) =>
  `color-mix(in oklab, ${base} ${ratio}%, ${other})`;

export const withOpacity = (base, alpha = 0.2) =>
  `color-mix(in oklab, ${base} ${Math.round((1 - alpha) * 100)}%, transparent)`;

/* ---------------------------------------
 * Smart tooltip
 * - Groups series like paid/received stacks
 * - Sums stacks per key
 * - Hides zero-valued rows unless all are zero
 * - Shows percentage when total known
 * ------------------------------------- */
export const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  // Group by well-known prefixes
  const groups = {
    paid: { keys: [], color: null, value: 0, label: LABELS.paid },
    received: { keys: [], color: null, value: 0, label: LABELS.received },
    remaining: { keys: [], color: MODERN_COLORS.neutral, value: 0, label: LABELS.remaining },
    other: {}, // dataKey -> {color, name, value}
  };

  // Collect and group
  payload.forEach((p) => {
    const k = String(p.dataKey || "");
    const v = safeNumber(p.value);
    const color = p.fill || p.color || MODERN_COLORS.neutral;

    if (k.startsWith("paid")) {
      groups.paid.value += v;
      groups.paid.color = groups.paid.color || color;
      groups.paid.keys.push(k);
    } else if (k.startsWith("received")) {
      groups.received.value += v;
      groups.received.color = groups.received.color || color;
      groups.received.keys.push(k);
    } else if (k.startsWith("remaining")) {
      groups.remaining.value += v;
      groups.remaining.color = color;
    } else {
      // keep original name
      const name = p.name || k;
      if (!groups.other[k]) groups.other[k] = { color, name, value: 0 };
      groups.other[k].value += v;
    }
  });

  // Build display rows
  const rows = [];
  if (groups.paid.value > 0 || payload.some(p => String(p.dataKey || "").startsWith("paid"))) {
    rows.push({ name: groups.paid.label, value: groups.paid.value, color: groups.paid.color || MODERN_COLORS.expense });
  }
  if (groups.received.value > 0 || payload.some(p => String(p.dataKey || "").startsWith("received"))) {
    rows.push({ name: groups.received.label, value: groups.received.value, color: groups.received.color || MODERN_COLORS.income });
  }
  if (groups.remaining.value > 0 || payload.some(p => String(p.dataKey || "").startsWith("remaining"))) {
    rows.push({ name: groups.remaining.label, value: groups.remaining.value, color: groups.remaining.color || MODERN_COLORS.neutral });
  }
  Object.values(groups.other).forEach((o) => rows.push(o));

  // Filter zeros unless everything is zero
  const nonZero = rows.filter((r) => r.value !== 0);
  const display = nonZero.length ? nonZero : rows.length ? [rows[0]] : [];

  // Try to infer total for pct (sum of all rows)
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
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: row.color || MODERN_COLORS.neutral,
              }}
            />
            <div style={{ color: MODERN_COLORS.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {row.name}
            </div>
            <div style={{ textAlign: "right", color: MODERN_COLORS.text }}>
              {formatCurrency(row.value)}
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
          <span>{formatCurrency(total)}</span>
        </div>
      )}
    </div>
  );
};

/* ---------------------------------------
 * Convenience defaults for Bars & Pies
 * ------------------------------------- */
export const BAR_DEFAULTS = {
  barGap: 4,
  barCategoryGap: "20%",
  radius: [6, 6, 0, 0],
};

export const PIE_DEFAULTS = {
  innerRadius: 50,
  outerRadius: 78,
  outerRingInner: 88,
  outerRingOuter: 110,
  paddingAngle: 1,
  stroke: "#fff",
  strokeWidth: 2,
};

/* ---------------------------------------
 * Example legend payloads
 * (use buildLegendPayload in components)
 * ------------------------------------- */
export const incomeLegend = () =>
  buildLegendPayload([
    { name: LABELS.received, color: MODERN_COLORS.income },
    { name: LABELS.remaining, color: MODERN_COLORS.incomeRemaining },
  ]);

export const expenseLegend = () =>
  buildLegendPayload([
    { name: LABELS.paid, color: MODERN_COLORS.expense },
    { name: LABELS.remaining, color: MODERN_COLORS.expenseRemaining },
  ]);

