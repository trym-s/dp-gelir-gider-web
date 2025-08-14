import React from 'react';
import { Form, Input, InputNumber, Button, DatePicker } from 'antd';
import moment from 'moment';

const PaymentForm = ({ card, onSubmit }) => {
  const [form] = Form.useForm();

  const onFinish = (values) => {
    const transactionDetails = {
      ...values,
      amount: String(values.amount),
      type: 'PAYMENT', // Formun türünü belirt
      transaction_date: values.transaction_date.format('YYYY-MM-DD'),
    };
    onSubmit(transactionDetails);
    form.resetFields();
  };

  return (
    <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ transaction_date: moment() }}>
      <Form.Item
        label="Ödeme Tutarı"
        name="amount"
        rules={[{ required: true, message: 'Lütfen tutarı girin!' }]}
      >
        <InputNumber
          formatter={value => {
            if (!value) return '';
            const parts = value.toString().split('.');
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            return `₺ ${parts.join(',')}`;
          }}
          parser={value => {
            if (!value) return '';
            return value.replace(/₺\s?|(\.*)/g, '').replace(',', '.');
          }}
          style={{ width: '100%' }}
          min={0}
        />
      </Form.Item>

      <Form.Item
        label="Açıklama"
        name="description"
        rules={[{ required: true, message: 'Lütfen bir açıklama girin!' }]}
      >
        <Input placeholder="Örn: Maaş Hesabından Ödeme" />
      </Form.Item>

      <Form.Item
        label="İşlem Tarihi"
        name="transaction_date"
        rules={[{ required: true, message: 'Lütfen bir tarih seçin!' }]}
      >
        <DatePicker style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" block style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}>
          Ödemeyi Onayla
        </Button>
      </Form.Item>
    </Form>
  );
};

export default PaymentForm;