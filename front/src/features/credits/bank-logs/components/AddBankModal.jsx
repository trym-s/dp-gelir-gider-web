// /front/src/features/credits/bank-logs/components/AddBankModal.jsx
import React from 'react';
import { Modal, Form, Input, Button } from 'antd';

export function AddBankModal({ visible, onOk, onCancel, loading }) {
  const [form] = Form.useForm();

  const handleOk = () => {
    form
      .validateFields()
      .then(values => {
        form.resetFields();
        onOk(values.name);
      })
      .catch(info => {
        console.log('Validate Failed:', info);
      });
  };

  return (
    <Modal
      title="Yeni Banka Ekle"
      visible={visible}
      onCancel={onCancel}
      footer={[
        <Button key="back" onClick={onCancel}>
          İptal
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={handleOk}>
          Ekle
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical" name="add_bank_form">
        <Form.Item
          name="name"
          label="Banka Adı"
          rules={[{ required: true, message: 'Lütfen banka adını girin!' }]}
        >
          <Input placeholder="Örn: Garanti BBVA" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
