// /front/src/features/credits/bank-logs/components/AddBankModal.jsx
import React, { useState } from 'react';
import { Modal, Form, Input, Button, Space, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

export function AddBankModal({ visible, onOk, onCancel, loading }) {
  const [form] = Form.useForm();
  const [accounts, setAccounts] = useState([{ name: '', kmh_limit: 0 }]);

  const handleOk = () => {
    form
      .validateFields()
      .then(values => {
        const finalValues = {
          name: values.name,
          accounts: accounts.map(account => ({
            name: account.name,
            overdraft_limit: account.kmh_limit
          })),
        };
        onOk(finalValues);
        form.resetFields();
        setAccounts([{ name: '', kmh_limit: 0 }]);
      })
      .catch(info => {
        console.log('Validate Failed:', info);
      });
  };

  const handleAccountChange = (index, field, value) => {
    const newAccounts = [...accounts];
    newAccounts[index][field] = value;
    setAccounts(newAccounts);
  };

  const addAccountField = () => {
    setAccounts([...accounts, { name: '', kmh_limit: 0 }]);
  };

  const removeAccountField = (index) => {
    const newAccounts = accounts.filter((_, i) => i !== index);
    setAccounts(newAccounts);
  };

  return (
    <Modal
      title="Yeni Banka ve Hesaplarını Ekle"
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="back" onClick={onCancel}>
          İptal
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={handleOk}>
          Banka ve Hesapları Ekle
        </Button>,
      ]}
      width={600}
    >
      <Form form={form} layout="vertical" name="add_bank_form">
        <Form.Item
          name="name"
          label="Banka Adı"
          rules={[{ required: true, message: 'Lütfen banka adını girin!' }]}
        >
          <Input placeholder="Örn: Garanti BBVA" />
        </Form.Item>

        <Divider>Hesaplar</Divider>

        {accounts.map((account, index) => (
          <Space key={index} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
            <Form.Item
              label="Hesap Adı"
              style={{ flex: 1 }}
              rules={[{ required: true, message: 'Lütfen hesap adını girin!' }]}
            >
              <Input
                placeholder="Örn: Vadesiz TL Hesabım"
                value={account.name}
                onChange={(e) => handleAccountChange(index, 'name', e.target.value)}
              />
            </Form.Item>
            <Form.Item
              label="KMH Limiti"
              rules={[{ required: true, message: 'Lütfen KMH limitini girin!' }]}
            >
              <Input
                placeholder="0"
                value={account.kmh_limit}
                onChange={(e) => handleAccountChange(index, 'kmh_limit', e.target.value)}
                style={{ width: '100px' }}
              />
            </Form.Item>
            {accounts.length > 1 && (
              <Button
                type="danger"
                icon={<DeleteOutlined />}
                onClick={() => removeAccountField(index)}
              />
            )}
          </Space>
        ))}

        <Button type="dashed" onClick={addAccountField} block icon={<PlusOutlined />}>
          Hesap Ekle
        </Button>
      </Form>
    </Modal>
  );
}
