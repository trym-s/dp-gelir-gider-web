// front/src/features/expenses/components/PaymentForm.jsx
import React, { useEffect, useState } from 'react';
import { Form, Input, Button, DatePicker, InputNumber, Row, Col, Typography, Alert, Space, Tooltip, Result, Descriptions } from "antd";
import { CalendarOutlined, InfoCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import dayjs from "dayjs";

const { TextArea } = Input;
const { Text, Title } = Typography;

const CURRENCY_META = {
  TRY: { symbol: "₺", label: "Türk Lirası", icon: "/currency/try.png" },
  USD: { symbol: "$", label: "US Dollar",   icon: "/currency/usd.png" },
  EUR: { symbol: "€", label: "Euro",        icon: "/currency/eur.png" },
  GBP: { symbol: "£", label: "Pound",       icon: "/currency/gbp.png" },
  AED: { symbol: "د.إ", label: "Dirham",     icon: "/currency/aed.png" },
};

function getCurrencyMeta(code) {
  return CURRENCY_META[code] || CURRENCY_META.TRY;
}
function formatMoney(value, symbol) {
  if (value === null || value === undefined || isNaN(Number(value))) return `0 ${symbol}`;
  return `${Number(value).toFixed(2)} ${symbol}`;
}

function PaymentSuccessScreen({ result, onClose }) {
  const currencyCode = (result.expense.currency && (result.expense.currency.value || result.expense.currency)) || "TRY";
  const { symbol } = getCurrencyMeta(currencyCode);

  return (
    <Result
      icon={<CheckCircleOutlined />}
      status="success"
      title="Ödeme Başarıyla Tamamlandı!"
      subTitle="Giderin son durumu aşağıda gösterilmiştir."
      extra={[
        <Button type="primary" key="close" onClick={onClose}>
          Kapat
        </Button>,
      ]}>
      <Descriptions bordered column={1} size="small">
        <Descriptions.Item label="Gider Açıklaması">{result.expense.description}</Descriptions.Item>
        <Descriptions.Item label="Ödenen Tutar">{formatMoney(result.payment_amount, symbol)}</Descriptions.Item>
        <Descriptions.Item label="Ödeme Tarihi">{dayjs(result.payment_date).format('DD/MM/YYYY')}</Descriptions.Item>
        {result.description && <Descriptions.Item label="Ödeme Notu">{result.description}</Descriptions.Item>}
      </Descriptions>
    </Result>
  );
}


export default function PaymentForm({ onFinish, onCancel, expense }) {
  const [form] = Form.useForm();
  const [paymentResult, setPaymentResult] = useState(null);

  if (!expense) return null;

  const currencyCode = (expense.currency && (expense.currency.value || expense.currency)) || "TRY";
  const { symbol, label, icon } = getCurrencyMeta(currencyCode);
  const remaining = parseFloat(expense.remaining_amount ?? 0) || 0;

  useEffect(() => {
    form.setFieldsValue({
      payment_amount: remaining > 0 ? remaining : 0.01,
    });
  }, [remaining, form]);

  const handleFormSubmit = async (values) => {
    const formattedValues = {
      ...values,
      payment_date: values.payment_date ? values.payment_date.format("YYYY-MM-DD") : null,
    };
    try {
      const result = await onFinish(formattedValues);
      setPaymentResult(result);
    } catch (error) {
      // Handle error if needed
      console.error("Payment failed:", error);
    }
  };

  if (paymentResult) {
    return <PaymentSuccessScreen result={paymentResult} onClose={onCancel} />;
  }

  // Tek addon: ikon + kod + sembol (sağda)
  const CurrencyAddon = (
    <Tooltip title={label}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
        {icon ? (
          <img
            src={icon}
            alt={currencyCode}
            style={{ width: 16, height: 16, objectFit: "contain" }}
          />
        ) : null}
        <span style={{ fontWeight: 600 }}>{currencyCode}</span>
        <span>{symbol}</span>
      </span>
    </Tooltip>
  );

  return (
    <Form
      layout="vertical"
      form={form}
      onFinish={handleFormSubmit}
      initialValues={{ payment_date: dayjs(), payment_amount: remaining > 0 ? remaining : 0.01 }}>
      <Alert
        message={<Text strong>{expense.description}</Text>}
        description={
          <Text>
            Bu gidere ait kalan tutar:{" "}
            <Text strong>
              {formatMoney(remaining, symbol)}{" "}
              <span style={{ opacity: 0.8, marginLeft: 6, fontSize: 12 }}>{currencyCode}</span>
            </Text>
          </Text>
        }
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        style={{ marginBottom: 24 }}
      />

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="Ödeme Tutarı"
            name="payment_amount"
            rules={[{ required: true, message: 'Lütfen ödeme tutarını girin.' }]}>
            <InputNumber
              style={{ width: "100%" }}
              min={0.01}
              max={Math.max(remaining, 0.01)}
              placeholder="0.00"
              addonAfter={CurrencyAddon}
              stringMode
            />
          </Form.Item>
        </Col>

        <Col span={12}>
          <Form.Item
            label="Ödeme Tarihi"
            name="payment_date"
            rules={[{ required: true, message: 'Lütfen bir tarih seçin.' }]}
          >
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" suffixIcon={<CalendarOutlined />} />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item label="Açıklama" name="description">
        <TextArea rows={3} placeholder="Ödeme ile ilgili notlar... (Opsiyonel)" />
      </Form.Item>

      <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={onCancel} size="large">İptal</Button>
          <Button type="primary" htmlType="submit" size="large">Ödemeyi Kaydet</Button>
        </Space>
      </Form.Item>
    </Form>
  );
}