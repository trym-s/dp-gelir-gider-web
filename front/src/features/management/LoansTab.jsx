// management/LoansTab.jsx

import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, Input, message, Popconfirm, Typography } from 'antd';
import { getLoans, updateLoan, deleteLoan } from '../../api/loanService'; // Kredi servislerini import ediyoruz

const { Text } = Typography;

const LoansTab = () => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [form] = Form.useForm();

  // Kredileri API'den çeken fonksiyon
  const fetchLoans = async () => {
    setLoading(true);
    try {
      const res = await getLoans();
      // DÜZELTME: Gelen yanıtın içindeki 'data' dizisine erişiyoruz.
      setLoans(res.data.map(loan => ({ ...loan, key: loan.id })));
    } catch (error) {
      message.error('Kredileri yüklerken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Bileşen ilk yüklendiğinde kredileri çekiyoruz
  useEffect(() => {
    fetchLoans();
  }, []);

  // Düzenleme modalını açan fonksiyon
  const showModal = (loan) => {
    setEditingLoan(loan);
    // Modal'daki formu, seçilen kredinin mevcut bilgileriyle dolduruyoruz
    form.setFieldsValue({
      name: loan.name,
      description: loan.description,
    });
    setIsModalVisible(true);
  };

  // Modal'ı kapatan fonksiyon
  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingLoan(null);
    form.resetFields();
  };

  // "Kaydet" butonuna basıldığında çalışan fonksiyon
  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await updateLoan(editingLoan.id, values);
      message.success('Kredi başarıyla güncellendi.');
      handleCancel();
      fetchLoans(); // Listeyi yenile
    } catch (error) {
      message.error('Güncelleme işlemi sırasında bir hata oluştu.');
    }
  };

  // Silme işlemini yapan fonksiyon
  const handleDelete = async (loanId) => {
    try {
      await deleteLoan(loanId);
      message.success('Kredi başarıyla silindi.');
      fetchLoans(); // Listeyi yenile
    } catch (error) {
      message.error('Silme işlemi sırasında bir hata oluştu.');
    }
  };

  // Tablo sütunlarını tanımlıyoruz
  const columns = [
    {
      title: 'Kredi Adı',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Banka Adı',
      dataIndex: ['bank_account', 'bank', 'name'], // İç içe veriye erişim
      key: 'bank_name',
      render: (bankName) => bankName || <Text type="secondary">Banka Bilgisi Yok</Text>,
    },
    {
      title: 'Kredi Türü',
      dataIndex: ['loan_type', 'name'], // İç içe veriye erişim
      key: 'loan_type',
      render: (loanType) => loanType || <Text type="secondary">Tür Bilgisi Yok</Text>,
    },
    {
      title: 'İşlemler',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button type="link" onClick={() => showModal(record)}>Düzenle</Button>
          <Popconfirm
            title="Bu krediyi silmek istediğinizden emin misiniz?"
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
      <Table columns={columns} dataSource={loans} rowKey="id" loading={loading} />
      <Modal
        title="Kredi Düzenle"
        open={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        okText="Kaydet"
        cancelText="İptal"
      >
        <Form form={form} layout="vertical" name="loan_edit_form">
          <Form.Item name="name" label="Kredi Adı" rules={[{ required: true, message: 'Lütfen kredi adını girin!' }]}>
            <Input />
          </Form.Item>
          {/* İsterseniz buraya düzenlemek için daha fazla alan ekleyebilirsiniz. */}
          <Form.Item name="description" label="Açıklama (Opsiyonel)">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default LoansTab;