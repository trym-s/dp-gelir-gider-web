import React, { useState, useEffect } from 'react';
import { Table, Button, Checkbox, Space, Modal, Form, Input, Select, message, InputNumber, Popconfirm } from 'antd';
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
  const [showKmhFields, setShowKmhFields] = useState(false);

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
    if (record) {
      // KMH bilgisi varsa, ilgili alanları doldur ve görünür yap
      if (record.kmh_account) {
        form.setFieldsValue({
          ...record,
          bank_id: record.bank?.id,
          create_kmh_limit: true, // Checkbox'ı işaretliyoruz
          kmh_name: record.kmh_account.name,
          kmh_limit: record.kmh_account.kmh_limit,
          statement_day: record.kmh_account.statement_day,
        });
        setShowKmhFields(true);
      } else {
        form.setFieldsValue({ ...record, bank_id: record.bank?.id });
        setShowKmhFields(false);
      }
    } else {
      form.resetFields();
      setShowKmhFields(false); // Yeni kayıt için KMH alanlarını gizle
    }
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingRecord(null);
    form.resetFields();
    setShowKmhFields(false); // Also reset on cancel
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      console.log("Submitting values:", values); // VERIFICATION LOG
      if (editingRecord) {
        await updateBankAccount(editingRecord.id, values);
        message.success('Banka hesabı başarıyla güncellendi.');
      } else {
        const newBankAccount = await createBankAccount(values);
        message.success('Banka hesabı başarıyla oluşturuldu.');

        if (values.create_kmh_limit) {
          try {
            await createKmhLimit({
              bank_account_id: newBankAccount.data.id,
              name: values.kmh_name, // Ensure this value is passed
              kmh_limit: values.kmh_limit,
              statement_day: values.statement_day,
            });
            message.success('KMH limiti başarıyla oluşturuldu.');
          } catch (kmhError) {
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
      >
        <Form form={form} layout="vertical" onValuesChange={(changedValues) => {
          if (changedValues.create_kmh_limit !== undefined) {
            setShowKmhFields(changedValues.create_kmh_limit);
          }
        }}>
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
          {showKmhFields && (
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
