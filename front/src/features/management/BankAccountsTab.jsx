import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, message } from 'antd';
import { getBankAccounts, createBankAccount, updateBankAccount, deleteBankAccount } from '../../api/bankAccountService';
import { getBanks } from '../../api/bankService';

const { Option } = Select;

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
      const [accountsRes, banksRes] = await Promise.all([
        getBankAccounts(),
        getBanks()
      ]);
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
    form.setFieldsValue(record ? { ...record, bank_id: record.bank?.id } : { name: '', iban: '', currency: 'TRY', bank_id: null });
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
      console.log('Submitting bank account form with values:', values); // Frontend log
      if (editingRecord) {
        console.log(`Calling updateBankAccount with ID: ${editingRecord.id}`); // Frontend log
        await updateBankAccount(editingRecord.id, values);
        message.success('Banka hesabı başarıyla güncellendi.');
      } else {
        console.log('Calling createBankAccount'); // Frontend log
        await createBankAccount(values);
        message.success('Banka hesabı başarıyla oluşturuldu.');
      }
      handleCancel();
      fetchData();
    } catch (error) {
      console.error('Error during bank account form submission:', error); // Frontend log
      message.error('İşlem sırasında bir hata oluştu.');
    }
  };

  const handleDelete = (recordId) => {
    Modal.confirm({
      title: 'Bu banka hesabını silmek istediğinizden emin misiniz?',
      onOk: async () => {
        try {
          await deleteBankAccount(recordId);
          message.success('Banka hesabı başarıyla silindi.');
          fetchData();
        } catch (error) {
          message.error('Silme işlemi sırasında bir hata oluştu.');
        }
      },
    });
  };

  const columns = [
    { title: 'Hesap Adı', dataIndex: 'name', key: 'name' },
    { title: 'IBAN', dataIndex: 'iban', key: 'iban' },
    { title: 'Para Birimi', dataIndex: 'currency', key: 'currency' },
    { 
      title: 'Banka', 
      dataIndex: 'bank', 
      key: 'bank',
      render: (bank) => bank?.name || 'N/A'
    },
    {
      title: 'İşlemler',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button type="link" onClick={() => showModal(record)}>Düzenle</Button>
          <Button type="link" danger onClick={() => handleDelete(record.id)}>Sil</Button>
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
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Hesap Adı" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="iban" label="IBAN">
            <Input />
          </Form.Item>
          <Form.Item name="currency" label="Para Birimi" rules={[{ required: true }]}>
            <Select>
              <Option value="TRY">TRY</Option>
              <Option value="USD">USD</Option>
              <Option value="EUR">EUR</Option>
            </Select>
          </Form.Item>
          <Form.Item name="bank_id" label="Banka" rules={[{ required: true }]}>
            <Select placeholder="Banka seçin">
              {banks.map(bank => (
                <Option key={bank.id} value={bank.id}>{bank.name}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default BankAccountsTab;
