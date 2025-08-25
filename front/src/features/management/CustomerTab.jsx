// front/src/management/CustomerTab.jsx

import React, { useState, useEffect } from 'react';
import { Table, Button, Space, message, Popconfirm } from 'antd';
import { customerService } from '../../api/customerService';
import CustomerFormModal from './CustomerFormModal'; // YENİ BİLEŞENİ IMPORT EDİN

const CustomerTab = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

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
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingCustomer(null);
  };

  // Yeni modal'dan gelen başarılı sonuç sonrası çalışacak fonksiyon
  const handleSuccess = () => {
    handleCancel();
    fetchCustomers(); // Listeyi yenile
  };

  const handleDelete = async (id) => {
    try {
      await customerService.remove(id); // 'delete' yerine 'remove'
      message.success('Müşteri başarıyla silindi.');
      fetchCustomers();
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
      
      {/* ESKİ MODAL SİLİNDİ, YERİNE YENİ BİLEŞEN GELDİ */}
      <CustomerFormModal
        visible={isModalVisible}
        onCancel={handleCancel}
        onSuccess={handleSuccess}
        initialValues={editingCustomer}
      />
    </>
  );
};

export default CustomerTab;