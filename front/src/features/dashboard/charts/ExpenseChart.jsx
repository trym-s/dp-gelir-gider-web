

import React, { useEffect, useMemo, useState } from 'react';
import { Card, Select, Space, Skeleton, Empty, Alert } from 'antd';
import {
  ResponsiveContainer,
  BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import {
  getExpenseGraphData,
  getExpenseDistributionData
} from '../../../api/dashboardService';
import { MODERN_COLORS, CustomTooltip, EXPENSE_PALETTE, formatAxisCurrency, formatCurrency } from './chartUtils';

const { Option } = Select;

const DISPLAY_OPTIONS = [
  { value: 'date_bar', label: 'Tarihe Göre (Bar)' },
  { value: 'pie_budget_item', label: 'Bütçe Kalemi (Pasta)' },
  { value: 'pie_region', label: 'Bölge (Pasta)' },
  { value: 'pie_account_name', label: 'Hesap Adı (Pasta)' },
  { value: 'pie_company', label: 'Firma (Pasta)' },
];

export default function ExpenseChart({
  startDate,
  endDate,
  currency = 'TRY',
  defaultDisplay = 'date_bar',
  onSliceClick,
}) {
  const [displayType, setDisplayType] = useState(defaultDisplay);
  const [loading, setLoading] = useState(false);
  const [barData, setBarData] = useState([]); // [{date, paid, remaining}]
  const [pieData, setPieData] = useState([]); // [{name, paid, remaining}]
  const [error, setError] = useState(null);

  const groupBy = useMemo(() => {
    if (displayType === 'pie_budget_item') return 'budget_item';
    if (displayType === 'pie_region') return 'region';
    if (displayType === 'pie_account_name') return 'account_name';
    if (displayType === 'pie_company') return 'company';
    return null;
  }, [displayType]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (displayType === 'date_bar') {
          const res = await getExpenseGraphData(startDate, endDate, { currency });
          if (!mounted) return;
          setBarData(Array.isArray(res) ? res : []);
          setPieData([]);
        } else {
          const res = await getExpenseDistributionData(startDate, endDate, groupBy, { currency });
          if (!mounted) return;
          setPieData(Array.isArray(res) ? res : []);
          setBarData([]);
        }
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || 'Beklenmeyen hata');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [startDate, endDate, displayType, groupBy, currency]);

  const filteredPie = useMemo(
    () => (pieData || []).filter(x => ((x?.paid ?? 0) > 0) || ((x?.remaining ?? 0) > 0)),
    [pieData]
  );

  const handlePieClick = (d) => {
    if (!d?.name) return;
    if (onSliceClick && groupBy) onSliceClick(groupBy, d.name);
  };

  const renderBar = () => {
    if (loading) return <Skeleton active paragraph={{ rows: 6 }} />;
    if (error) return <Alert type="error" message="Hata" description={String(error)} />;
    const hasData = (barData || []).some(d => (d?.paid ?? 0) > 0 || (d?.remaining ?? 0) > 0);
    if (!hasData) return <Empty description="Gösterilecek gider verisi yok." />;

    return (
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={barData} margin={{ top: 16, right: 24, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis tickFormatter={(v) => formatAxisCurrency(v, currency)} />
          <Tooltip content={<CustomTooltip currency={currency} />} />
          <Legend />
          <Bar name="Ödenen" dataKey="paid" stackId="a" fill={MODERN_COLORS.expense} />
          <Bar name="Kalan" dataKey="remaining" stackId="a" fill={MODERN_COLORS.expenseRemaining} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderPie = () => {
    if (loading) return <Skeleton active paragraph={{ rows: 6 }} />;
    if (error) return <Alert type="error" message="Hata" description={String(error)} />;

    if (filteredPie.length === 0) return <Empty description="Gösterilecek gider verisi yok." />;

    const inner = filteredPie.map(x => ({ name: x.name, value: x.paid ?? 0 }));
    const outer = filteredPie.map(x => ({ name: x.name, value: x.remaining ?? 0 }));
    const totalPaid = inner.reduce((s, a) => s + (a.value || 0), 0);

    return (
      <ResponsiveContainer width="100%" height={340}>
        <PieChart margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
          {totalPaid <= 0 ? (
            <Pie
              data={outer}
              dataKey="value"
              nameKey="name"
              cx="50%" cy="50%"
              innerRadius={60} outerRadius={100}
              paddingAngle={1} stroke="#fff" strokeWidth={2}
              onClick={handlePieClick}
              labelLine={false}
              label={({ name, value }) => (value > 0 ? `${name} • ${formatCurrency(value, currency)}` : '')}
            >
              {outer.map((_, i) => (
                <Cell key={`out-${i}`} fill={MODERN_COLORS.expenseRemaining} cursor="pointer" />
              ))}
            </Pie>
          ) : (
            <>
              <Pie
                data={inner}
                dataKey="value"
                nameKey="name"
                cx="50%" cy="50%"
                innerRadius={50} outerRadius={78}
                paddingAngle={1} stroke="#fff" strokeWidth={2}
                onClick={handlePieClick}
                labelLine={false}
                label={({ name, value }) => (value > 0 ? `${name} • ${formatCurrency(value, currency)}` : '')}
              >
                {inner.map((_, i) => (
                  <Cell key={`in-${i}`} fill={EXPENSE_PALETTE[i % EXPENSE_PALETTE.length]} cursor="pointer" />
                ))}
              </Pie>
              <Pie
                data={outer}
                dataKey="value"
                nameKey="name"
                cx="50%" cy="50%"
                innerRadius={88} outerRadius={110}
                paddingAngle={1} stroke="#fff" strokeWidth={2}
                onClick={handlePieClick}
                labelLine={false}
                label={({ value }) => (value > 0 ? `${formatCurrency(value, currency)}` : '')}
              >
                {outer.map((_, i) => (
                  <Cell key={`out-${i}`} fill={MODERN_COLORS.expenseRemaining} cursor="pointer" />
                ))}
              </Pie>
            </>
          )}

          <Tooltip content={<CustomTooltip currency={currency} />} />
          <Legend payload={[
            { value: 'Ödenen', type: 'rect', color: MODERN_COLORS.expense, id: 'legend-paid' },
            { value: 'Kalan', type: 'rect', color: MODERN_COLORS.expenseRemaining, id: 'legend-remaining' },
          ]} />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  const headerRight = (
    <Space size="small" wrap>
      <Select value={displayType} onChange={setDisplayType} style={{ width: 220 }}>
        {DISPLAY_OPTIONS.map(opt => (
          <Option key={opt.value} value={opt.value}>{opt.label}</Option>
        ))}
      </Select>
    </Space>
  );

  const isPie = displayType !== 'date_bar';

  return (
    <Card
      title="Gider"
      className="summary-category-card"
      extra={headerRight}
      bodyStyle={{ padding: 0 }}
    >
      <div style={{ height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isPie ? renderPie() : renderBar()}
      </div>
    </Card>
  );
}

