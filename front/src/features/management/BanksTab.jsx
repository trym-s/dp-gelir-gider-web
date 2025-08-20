
import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, Input, message, Popconfirm, Tooltip } from 'antd';
import { getBanks, createBank, updateBank, deleteBank } from '../../api/bankService';
import { bankLogoMap } from '../../icons/bankLogoMap';

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
    form.setFieldsValue(bank ? { name: bank.name } : { name: '' });
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
      if (editingBank) {
        await updateBank(editingBank.id, values);
        message.success('Banka başarıyla güncellendi.');
      } else {
        await createBank(values);
        message.success('Banka başarıyla oluşturuldu.');
      }
      handleCancel();
      fetchBanks();
    } catch (error) {
      message.error('İşlem sırasında bir hata oluştu.');
      console.error('Error during bank form submission:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteBank(id);
      message.success('Banka başarıyla silindi.');
      fetchBanks();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Silme işlemi sırasında bir hata oluştu.';
      message.error(errorMessage);
      console.error('Banka silinirken hata:', error);
    }
  };

  const columns = [
{
    title: 'Banka',
    key: 'name',
    render: (_, bank) => {
      const src = bankLogoMap[bank.name] || bankLogoMap.default;
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <img src={src} alt={bank.name} style={{ width: 20, height: 20, objectFit: 'contain' }} />
          {bank.name}
        </span>
      );
    },
  },
    {
      title: 'İşlemler',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button type="link" onClick={() => showModal(record)}>Düzenle</Button>
          <Popconfirm
            title="Bu bankayı silmek istediğinizden emin misiniz?"
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
          <Form.Item
            name="name"
            label="Banka Adı"
            rules={[{ required: true, message: 'Lütfen banka adını girin!' }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default BanksTab;

