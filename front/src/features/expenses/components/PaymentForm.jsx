import React, { useEffect } from 'react';
import { Form, Input, Button, DatePicker, InputNumber, Row, Col, Typography, Alert, Space } from "antd";
import { DollarCircleOutlined, CalendarOutlined, InfoCircleOutlined } from '@ant-design/icons';
import dayjs from "dayjs";

const { TextArea } = Input;
const { Text, Paragraph } = Typography;

export default function PaymentForm({ onFinish, onCancel, expense }) {
  const [form] = Form.useForm();

  // Kalan tutar değiştiğinde, formdaki ödeme tutarını da güncelle
  useEffect(() => {
    if (expense) {
      form.setFieldsValue({
        payment_amount: parseFloat(expense.remaining_amount) > 0 ? parseFloat(expense.remaining_amount) : 0.01
      });
    }
  }, [expense, form]);

  const handleFormSubmit = (values) => {
    const formattedValues = {
      ...values,
      payment_date: values.payment_date ? values.payment_date.format("YYYY-MM-DD") : null,
    };
    onFinish(formattedValues);
  };

  if (!expense) return null; // Gider bilgisi yoksa formu render etme

  return (
    <Form
      layout="vertical"
      form={form}
      onFinish={handleFormSubmit}
      initialValues={{ 
        payment_date: dayjs(),
        payment_amount: parseFloat(expense.remaining_amount) > 0 ? parseFloat(expense.remaining_amount) : 0.01
      }}
    >
      <Alert
        message={<Text strong>{expense.description}</Text>}
        description={
            <Text>
                Bu gidere ait kalan tutar: <Text strong>{expense.remaining_amount} ₺</Text>
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
            rules={[{ required: true, message: 'Lütfen ödeme tutarını girin.' }]}
          >
            <InputNumber
              style={{ width: "100%" }}
              min={0.01}
              max={parseFloat(expense.remaining_amount)}
              placeholder="0.00"
              addonBefore={<DollarCircleOutlined />}
              addonAfter="₺"
              autoFocus
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="Ödeme Tarihi"
            name="payment_date"
            rules={[{ required: true, message: 'Lütfen bir tarih seçin.' }]}
          >
            <DatePicker 
              style={{ width: "100%" }} 
              format="DD/MM/YYYY" 
              suffixIcon={<CalendarOutlined />}
            />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item label="Açıklama" name="description">
        <TextArea rows={3} placeholder="Ödeme ile ilgili notlar... (Opsiyonel)"/>
      </Form.Item>
      
      <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={onCancel} size="large">
            İptal
          </Button>
          <Button type="primary" htmlType="submit" size="large">
            Ödemeyi Kaydet
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
}