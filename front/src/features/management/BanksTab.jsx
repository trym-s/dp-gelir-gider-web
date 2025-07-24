import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, Input, message, Tooltip } from 'antd';
import { getBanks, createBank, updateBank, deleteBank } from '../../api/bankService';

const BanksTab = () => {
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingBank, setEditingBank] = useState(null);
  const [form] = Form.useForm();

  const fetchBanks = async () => {
    setLoading(true);
    try {
      const res = await getBanks();
      setBanks(res.data);
    } catch (error) {
      message.error('Bankaları yüklerken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanks();
  }, []);

  const showModal = (bank = null) => {
    setEditingBank(bank);
    form.setFieldsValue(bank ? { name: bank.name, logo_url: bank.logo_url } : { name: '', logo_url: '' });
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingBank(null);
    form.resetFields();
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      console.log('Submitting bank form with values:', values); // Frontend log
      if (editingBank) {
        console.log(`Calling updateBank with ID: ${editingBank.id}`); // Frontend log
        await updateBank(editingBank.id, values);
        message.success('Banka başarıyla güncellendi.');
      } else {
        console.log('Calling createBank'); // Frontend log
        await createBank(values);
        message.success('Banka başarıyla oluşturuldu.');
      }
      handleCancel();
      fetchBanks();
    } catch (error) {
      console.error('Error during bank form submission:', error); // Frontend log
      message.error('İşlem sırasında bir hata oluştu.');
    }
  };

  const handleDelete = (bankId) => {
    Modal.confirm({
      title: 'Bu bankayı silmek istediğinizden emin misiniz?',
      content: 'Bu işlem geri alınamaz.',
      onOk: async () => {
        try {
          await deleteBank(bankId);
          message.success('Banka başarıyla silindi.');
          fetchBanks();
        } catch (error) {
          message.error('Silme işlemi sırasında bir hata oluştu.');
        }
      },
    });
  };

  const columns = [
    { title: 'Banka Adı', dataIndex: 'name', key: 'name' },
    { 
      title: 'Logo', 
      dataIndex: 'logo_url', 
      key: 'logo_url',
      render: (logo_url) => {
        if (!logo_url) {
          return 'Logo Yok';
        }
        return <img src={logo_url} alt="" />;
      }
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
        Yeni Banka Ekle
      </Button>
      <Table columns={columns} dataSource={banks} rowKey="id" loading={loading} />
      <Modal
        title={editingBank ? 'Banka Düzenle' : 'Yeni Banka Ekle'}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        okText="Kaydet"
        cancelText="İptal"
      >
        <Form form={form} layout="vertical" name="bank_form">
          <Form.Item name="name" label="Banka Adı" rules={[{ required: true, message: 'Lütfen banka adını girin!' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="logo_url" label="Logo URL">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default BanksTab;
