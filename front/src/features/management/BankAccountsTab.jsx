
import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, message, Popconfirm, Tooltip, Typography } from 'antd';
import { getBankAccounts, createBankAccount, updateBankAccount, deleteBankAccount } from '../../api/bankAccountService';
import { getBanks } from '../../api/bankService';
import { CopyOutlined } from '@ant-design/icons';
import { bankLogoMap } from '../../icons/bankLogoMap';
const { Option } = Select;
const { Text } = Typography;

/* ---------- IBAN helpers ---------- */
const cleanIban = (v) => (v || '').replace(/\s+/g, '').toUpperCase();
const formatIban = (v) => cleanIban(v).replace(/(.{4})/g, '$1 ').trim();

const trIbanValidator = () => ({
  validator(_, value) {
    if (!value) return Promise.resolve();
    const cleaned = cleanIban(value);
    // TR + 24 digit (total length 26)
    if (!/^TR\d{24}$/.test(cleaned)) {
      return Promise.reject(new Error('IBAN "TR" ile başlamalı ve ardından 24 rakam gelmeli (toplam 26 karakter).'));
    }
    
    return Promise.resolve();
  },
});

const BankAccountsTab = () => {
  const [accounts, setAccounts] = useState([]);
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [accountsRes, banksRes] = await Promise.all([getBankAccounts(), getBanks()]);
      setAccounts(accountsRes.data);
      setBanks(banksRes.data);
    } catch (error) {
      message.error('Verileri yüklerken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showModal = (record = null) => {
    setEditingRecord(record);
    if (record) {
      form.setFieldsValue({
        name: record.name,
        bank_id: record.bank?.id,
        currency: record.currency,
        // kullanıcıya formatlı göster
        iban_number: formatIban(record.iban_number),
      });
    } else {
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingRecord(null);
    form.resetFields();
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      // IBAN’ı temizleyip gönder
      if (values.iban_number) values.iban_number = cleanIban(values.iban_number);

      if (editingRecord) {
        await updateBankAccount(editingRecord.id, values);
        message.success('Banka hesabı başarıyla güncellendi.');
      } else {
        await createBankAccount(values);
        message.success('Banka hesabı başarıyla oluşturuldu.');
      }
      handleCancel();
      fetchData();
    } catch (error) {
      console.error('Error during bank account form submission:', error);
      message.error('İşlem sırasında bir hata oluştu.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteBankAccount(id);
      message.success('Banka hesabı başarıyla silindi.');
      fetchData();
    } catch (error) {
      message.error('Silme işlemi sırasında bir hata oluştu.');
      console.error('Banka hesabı silinirken hata:', error);
    }
  };

  const columns = [
    { title: 'Hesap Adı', dataIndex: 'name', key: 'name' },
 {
      title: 'Banka',
      dataIndex: 'bank',
      key: 'bank',
      render: (bank) => {
        const name = bank?.name;
        if (!name) return 'N/A';
        const src = bankLogoMap[name] || bankLogoMap.default;
        return (
          <span style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
          <img src={src} alt={name} style={{ width:20, height:20, objectFit:'contain' }} />
          {name}
          </span>
        );
      },
    },

    {
      title: 'IBAN',
      dataIndex: 'iban_number',
      key: 'iban_number',
      render: (iban) => {
        const formatted = formatIban(iban);
        return (
          <Space>
            <Text code style={{ userSelect: 'text' }}>{formatted || '—'}</Text>
            {iban && (
              <Tooltip title="IBAN kopyala">
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => {
                    navigator.clipboard.writeText(cleanIban(iban));
                    message.success('IBAN kopyalandı.');
                  }}
                />
              </Tooltip>
            )}
          </Space>
        );
      },
    },
    { title: 'Para Birimi', dataIndex: 'currency', key: 'currency' },
       {
      title: 'İşlemler',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button type="link" onClick={() => showModal(record)}>Düzenle</Button>
          <Popconfirm
            title="Bu banka hesabını silmek istediğinizden emin misiniz?"
            onConfirm={() => handleDelete(record.id)}
            okText="Evet, Sil"
            cancelText="İptal"
          >
            <Button type="link" danger>Sil</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Button onClick={() => showModal()} type="primary" style={{ marginBottom: 16 }}>
        Yeni Banka Hesabı Ekle
      </Button>
      <Table columns={columns} dataSource={accounts} rowKey="id" loading={loading} />

      <Modal
        title={editingRecord ? 'Banka Hesabı Düzenle' : 'Yeni Banka Hesabı Ekle'}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        okText="Kaydet"
        cancelText="İptal"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Hesap Adı"
            rules={[{ required: true, message: 'Lütfen bir hesap adı girin.' }]}
          >
            <Input placeholder="Örn: Ana Hesap (TL)" />
          </Form.Item>

          <Form.Item
            name="bank_id"
            label="Banka"
            rules={[{ required: true, message: 'Lütfen bir banka seçin.' }]}
          >
            <Select placeholder="Banka seçin">
              {banks.map((bank) => (
                <Option key={bank.id} value={bank.id}>{bank.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="currency"
            label="Para Birimi"
            rules={[{ required: true, message: 'Lütfen bir para birimi seçin.' }]}
          >
            <Select placeholder="Para birimi seçin">
              <Option value="TRY">₺ TRY</Option>
              <Option value="USD">$ USD</Option>
              <Option value="EUR">€ EUR</Option>
              <Option value="GBP">£ GBP</Option>
              <Option value="AED">د.إ AED</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="iban_number"
            label="IBAN"
            tooltip="TR ile başlayacak. Giriş sırasında otomatik gruplandırılır."
            rules={[trIbanValidator()]}
          >
            <Input
              placeholder="TR00 0000 0000 0000 0000 0000 00"
              maxLength={32}
              onChange={(e) => {
                const v = e.target.value;
                // anında gruplama: kullanıcı deneyimi için
                form.setFieldsValue({ iban_number: formatIban(v) });
              }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default BankAccountsTab;

