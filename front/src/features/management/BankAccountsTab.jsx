import React, { useState, useEffect } from 'react';
import { Table, Button, Checkbox, Space, Modal, Form, Input, Select, message, InputNumber } from 'antd';
import { getBankAccounts, createBankAccount, updateBankAccount, deleteBankAccount } from '../../api/bankAccountService';
import { getBanks } from '../../api/bankService';
import { createKmhLimit } from '../../api/KMHStatusService';

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
      console.log('Values.kmh_name:', values.kmh_name); // Debug log
      console.log('Values.kmh_limit:', values.kmh_limit); // Debug log
      console.log('Values.statement_day:', values.statement_day); // Debug log
      if (editingRecord) {
        console.log(`Calling updateBankAccount with ID: ${editingRecord.id}`); // Frontend log
        await updateBankAccount(editingRecord.id, values);
        message.success('Banka hesabı başarıyla güncellendi.');
      } else {
        console.log('Calling createBankAccount'); // Frontend log
        const newBankAccount = await createBankAccount(values);
        message.success('Banka hesabı başarıyla oluşturuldu.');

        if (values.create_kmh_limit) {
          try {
            await createKmhLimit({
              bank_account_id: newBankAccount.data.id,
              name: values.kmh_name,
              kmh_limit: values.kmh_limit,
              statement_day: values.statement_day,
            });
            message.success('KMH limiti başarıyla oluşturuldu.');
          } catch (kmhError) {
            console.error('Error creating KMH limit:', kmhError); // Frontend log
            message.error('KMH limiti oluşturulurken bir hata oluştu.');
          }
        }
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
          <Form.Item name="bank_id" label="Banka" rules={[{ required: true }]}>
            <Select placeholder="Banka seçin">
              {banks.map(bank => (
                <Option key={bank.id} value={bank.id}>{bank.name}</Option>
              ))}
            </Select>
          </Form.Item>
          

          <Form.Item name="iban_number" label="IBAN">
            <Input />
          </Form.Item>
          <Form.Item name="create_kmh_limit" valuePropName="checked">
            <Checkbox>KMH Limiti Oluştur</Checkbox>
          </Form.Item>
          {form.getFieldValue('create_kmh_limit') && (
            <>
              <Form.Item name="kmh_name" label="KMH Adı" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="kmh_limit" label="KMH Limiti" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
              <Form.Item name="statement_day" label="Hesap Kesim Günü" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={1} max={31} />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </>
  );
};

export default BankAccountsTab;
