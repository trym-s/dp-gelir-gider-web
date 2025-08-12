
import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, Input, message, Popconfirm } from 'antd';
import { customerService } from '../../api/customerService';

const CustomerTab = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [form] = Form.useForm();

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await customerService.getAll();
      setCustomers(res);
    } catch (error) {
      message.error('Müşterileri yüklerken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const showModal = (customer = null) => {
    setEditingCustomer(customer);
    form.setFieldsValue(customer ? { name: customer.name, tax_number: customer.tax_number } : { name: '', tax_number: ''});
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingCustomer(null);
    form.resetFields();
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingCustomer) {
        await customerService.update(editingCustomer.id, values);
        message.success('Müşteri başarıyla güncellendi.');
      } else {
        await customerService.create(values);
        message.success('Müşteri başarıyla oluşturuldu.');
      }
      handleCancel();
      fetchCustomers();
    } catch (error) {
      message.error('İşlem sırasında bir hata oluştu.');
    }
  };

 const handleDelete = async (id) => {
    try {
      await customerService.remove(id); // 'delete' yerine 'remove'
      message.success('Müşteri başarıyla silindi.');
      fetchCustomers(); // Silme sonrası listeyi yenile
    } catch (error) {
      message.error('Silme işlemi sırasında bir hata oluştu.');
    }
  };

  const columns = [
    { title: 'Müşteri Adı', dataIndex: 'name', key: 'name' },
    { title: 'Vergi Numarası', dataIndex: 'tax_number', key: 'tax_number' },
    {
      title: 'İşlemler',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button type="link" onClick={() => showModal(record)}>Düzenle</Button>
          <Popconfirm
            title="Bu müşteriyi silmek istediğinizden emin misiniz?"
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
        Yeni Müşteri Ekle
      </Button>
      <Table columns={columns} dataSource={customers} rowKey="id" loading={loading} />
      <Modal
        title={editingCustomer ? 'Müşteri Düzenle' : 'Yeni Müşteri Ekle'}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        okText="Kaydet"
        cancelText="İptal"
      >
        <Form form={form} layout="vertical" name="customer_form">
          <Form.Item name="name" label="Müşteri Adı" rules={[{ required: true, message: 'Lütfen müşteri adını girin!' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="tax_number" label="Vergi Numarası">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default CustomerTab;
