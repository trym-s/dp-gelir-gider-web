
import React from 'react';
import {
  Modal, Button, Row, Col, Statistic, Tag, Typography, Divider, Tooltip
} from 'antd';
import {
  EditOutlined, CalendarOutlined, TagOutlined, EnvironmentOutlined, DollarCircleOutlined,
  CheckCircleOutlined, ExclamationCircleOutlined, DeleteOutlined, ArrowLeftOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const fmtTL = (v) => Number(v ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const isPaidLike = (s) => s === 'PAID' || s === 'PARTIALLY_PAID' || s === 'OVERPAID';
const statusView = (s) => ({
  color: s === 'PAID' ? 'green' : s === 'PARTIALLY_PAID' ? 'orange' : s === 'OVERPAID' ? 'purple' : 'red',
  text: s === 'PAID' ? 'Ödendi' : s === 'PARTIALLY_PAID' ? 'Kısmi Ödendi' : s === 'OVERPAID' ? 'Fazla Ödendi' : 'Ödenmedi',
  icon: s === 'PAID' || s === 'OVERPAID' ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />
});

const pickName = (ln) => {
  const c = [ln?.item_name, ln?.description, ln?.item, ln?.name, ln?.ProductName];
  const hit = c.find((x) => (x ?? '').toString().trim());
  return hit ? hit.toString().trim() : null;
};

const LineChip = ({ line }) => {
  const name = pickName(line);
  const qty  = line?.quantity ?? line?.qty;
  const unit = line?.unit_price ?? line?.unitPrice ?? line?.price;
  const net  = line?.net_amount_try ?? line?.net ?? line?.total;

  const haveFormula = qty || unit || net;
  if (!name && !haveFormula) return null;

  const kdv = line?.kdv_amount;
  const formula = haveFormula
    ? `${qty ? Number(qty) : ''}${qty && unit ? ' × ' : ''}${unit ? `₺ ${fmtTL(unit)}` : ''}${kdv ? ` + KDV (₺ ${fmtTL(kdv)})` : ''}${(qty || unit || kdv) && net ? ' → ' : ''}${net ? `₺ ${fmtTL(net)}` : ''}`
    : null;

  return (
    <div style={{
      border: '1px solid #eee', background: '#fafafa', borderRadius: 12,
      padding: '10px 12px', display: 'inline-flex', flexDirection: 'column', gap: 4,
      maxWidth: '100%', boxShadow: '0 1px 2px rgba(0,0,0,.04)',
      transition: 'all 0.2s ease-in-out', // Added transition for hover effect
      cursor: 'default', // Indicate it's not clickable
    }}
    onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,.1)'} // Hover effect
    onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,.04)'} // Reset on mouse leave
    >
      <div style={{ fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '60ch' }}
           title={name || formula}>
        {name || formula}
      </div>
      {name && formula ? <div style={{ color: '#8c8c8c', fontSize: 12 }}>{formula}</div> : null}
    </div>
  );
};

export default function ExpenseDetailModal({ expense, visible, onCancel, onBack, onEdit, onDelete, onAddPayment }) {
  if (!expense) return null;

  const sv = statusView(expense.status);
  const linesRaw = Array.isArray(expense.lines) ? expense.lines : [];
  const lines = linesRaw.filter((ln) => {
    const name = pickName(ln);
    const qty  = ln?.quantity ?? ln?.qty;
    const unit = ln?.unit_price ?? ln?.unitPrice ?? ln?.price;
    const net  = ln?.net_amount_try ?? ln?.net ?? ln?.total;
    return !!(name || qty || unit || net);
  });

  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      width={760}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {onBack && (
            <Tooltip title="Geri">
              <Button shape="circle" icon={<ArrowLeftOutlined />} onClick={onBack} style={{ border: 'none' }} />
            </Tooltip>
          )}
          <div style={{ flex: 1 }}>
            <Title level={4} style={{ margin: 0 }}>Gider Detayı</Title>
            {expense.invoice_number && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                Fatura No: <Text code>{expense.invoice_number}</Text>
              </Text>
            )}
          </div>
          <Tag icon={sv.icon} color={sv.color} style={{ fontSize: 14, padding: '4px 10px' }}>{sv.text}</Tag>
        </div>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <Button danger icon={<DeleteOutlined />} onClick={() => onDelete && onDelete(expense.id)}>Sil</Button>
          <div>
            {(expense.status === 'UNPAID' || expense.status === 'PARTIALLY_PAID') && (
              <Button style={{ marginRight: 8 }} onClick={() => onAddPayment && onAddPayment(expense)}>
                ₺ Ödeme Gir
              </Button>
            )}
            <Button icon={<EditOutlined />} onClick={() => onEdit && onEdit(expense)}>Düzenle</Button>
          </div>
        </div>
      }
    >
      {expense.description && (
        <>
          <Title level={5} style={{ marginTop: 4, marginBottom: 0 }}>{expense.description}</Title>
          <Divider style={{ margin: '12px 0' }} />
        </>
      )}

      <Row gutter={[24, 8]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} md={8}>
          <Statistic title="Tutar" value={Number(expense.amount || 0)} prefix="₺" precision={2} />
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Statistic title="Kalan Tutar" value={Number(expense.remaining_amount || 0)} prefix="₺" precision={2} />
        </Col>
        <Col xs={24} sm={12} md={8}>
          <div style={{ marginBottom: 14 }}>
            <Text type="secondary"><CalendarOutlined /> Fatura Tarihi</Text><br />
            <Text strong>{expense.date ? dayjs(expense.date).format('DD MMMM YYYY') : '-'}</Text>
          </div>
        </Col>
      </Row>

      <Row gutter={[8, 8]} style={{ marginTop: 8, marginBottom: 16 }}>
        <Col><Tag icon={<EnvironmentOutlined />} color="geekblue">{expense.region?.name || 'Bölge: -'}</Tag></Col>
        <Col><Tag icon={<DollarCircleOutlined />} color="lime">{expense.payment_type?.name || 'Ödeme Türü: -'}</Tag></Col>
        <Col><Tag icon={<TagOutlined />} color="volcano">{expense.account_name?.name || 'Hesap: -'}</Tag></Col>
        <Col><Tag icon={<TagOutlined />} color="gold">{expense.budget_item?.name || 'Bütçe: -'}</Tag></Col>
      </Row>

      {lines.length > 0 && (
        <>
          <Divider style={{ margin: '16px 0' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text strong>Kalemler</Text>
            <Text type="secondary">{lines.length} adet</Text>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, rowGap: 12 }}>
            {lines.slice(0, 12).map((ln, i) => <LineChip key={i} line={ln} />)}
            {lines.length > 12 && (
              <span style={{ alignSelf: 'center', color: '#8c8c8c' }}>… ve {lines.length - 12} diğer</span>
            )}
          </div>
        </>
      )}

      <Divider style={{ margin: '16px 0' }} />
      <Row justify="space-between" style={{ color: 'var(--text-color-light)', fontSize: 12 }}>
        <Col>Oluşturulma: {expense.created_at ? dayjs(expense.created_at).format('DD.MM.YY HH:mm') : '-'}</Col>
        <Col>Güncelleme: {expense.updated_at ? dayjs(expense.updated_at).format('DD.MM.YY HH:mm') : '-'}</Col>
      </Row>
    </Modal>
  );
}

