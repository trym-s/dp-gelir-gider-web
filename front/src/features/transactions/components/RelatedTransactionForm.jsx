import React from 'react';
import { Form, Input, Button, DatePicker, InputNumber, Select } from "antd";
import dayjs from "dayjs";
import styles from '../../shared/Form.module.css';

const { Option } = Select;

export default function RelatedTransactionForm({ onFinish, onCancel, parentTransaction, config, isSaving }) {
  const [form] = Form.useForm();
  const entityName = config.entity === 'expense' ? 'Ödeme' : 'Tahsilat';

  const handleFormSubmit = (values) => {
    const payload = {
      ...values,
      date: values.date ? values.date.format("YYYY-MM-DD") : null,
    };
    onFinish(payload);
  };

  return (
    <Form layout="vertical" form={form} onFinish={handleFormSubmit} initialValues={{ date: dayjs() }}>
      <Form.Item label="Tutar" name="amount" rules={[{ required: true, message: 'Lütfen tutarı girin.' }]}>
        <InputNumber
          style={{ width: "100%" }}
          min={0}
          max={parentTransaction.remaining_amount}
          placeholder="0.00"
          addonAfter="₺"
        />
      </Form.Item>
      <Form.Item label={`${entityName} Tarihi`} name="date" rules={[{ required: true, message: 'Lütfen bir tarih seçin.' }]}>
        <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
      </Form.Item>
      {/* Add other fields if necessary, e.g., payment type for payments */}
      <div className={styles.formActions}>
        <Button onClick={onCancel} size="large" disabled={isSaving}>İptal</Button>
        <Button type="primary" htmlType="submit" size="large" loading={isSaving}>
          {entityName} Ekle
        </Button>
      </div>
    </Form>
  );
}
