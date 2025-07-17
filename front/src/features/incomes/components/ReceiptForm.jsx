import React, { useEffect } from 'react';
import { Form, Input, Button, DatePicker, InputNumber, Row, Col, Typography, Alert, Space } from "antd";
import { DollarCircleOutlined, CalendarOutlined, InfoCircleOutlined } from '@ant-design/icons';
import dayjs from "dayjs";

const { TextArea } = Input;
const { Text } = Typography;

export default function ReceiptForm({ onFinish, onCancel, income }) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (income) {
      form.setFieldsValue({
        receipt_amount: parseFloat(income.remaining_amount) > 0 ? parseFloat(income.remaining_amount) : 0.01
      });
    }
  }, [income, form]);

  const handleFormSubmit = (values) => {
    const formattedValues = {
      ...values,
      receipt_date: values.receipt_date ? values.receipt_date.format("YYYY-MM-DD") : null,
    };
    onFinish(formattedValues);
  };

  if (!income) return null;

  return (
    <Form
      layout="vertical"
      form={form}
      onFinish={handleFormSubmit}
      initialValues={{ 
        receipt_date: dayjs(),
        receipt_amount: parseFloat(income.remaining_amount) > 0 ? parseFloat(income.remaining_amount) : 0.01
      }}
    >
      <Alert
        message={<Text strong>{income.description}</Text>}
        description={
            <Text>
                Bu gelire ait kalan tutar: <Text strong>{income.remaining_amount} ₺</Text>
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
            label="Tahsilat Tutarı"
            name="receipt_amount"
            rules={[{ required: true, message: 'Lütfen tahsilat tutarını girin.' }]}
          >
            <InputNumber
              style={{ width: "100%" }}
              min={0.01}
              placeholder="0.00"
              addonBefore={<DollarCircleOutlined />}
              addonAfter="₺"
              autoFocus
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="Tahsilat Tarihi"
            name="receipt_date"
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
      <Form.Item label="Notlar" name="notes">
        <TextArea rows={3} placeholder="Tahsilat ile ilgili notlar... (Opsiyonel)"/>
      </Form.Item>
      
      <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={onCancel} size="large">
            İptal
          </Button>
          <Button type="primary" htmlType="submit" size="large">
            Tahsilatı Kaydet
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
}