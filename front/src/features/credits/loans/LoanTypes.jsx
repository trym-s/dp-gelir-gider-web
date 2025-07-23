import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  message,
  Popconfirm,
  Space,
  Typography,
  Spin
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { 
  getLoanTypes, 
  createLoanType, 
  updateLoanType, 
  deleteLoanType 
} from '../../../api/loanService';

const { Title } = Typography;

const LoanTypes = () => {
  const [loanTypes, setLoanTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingLoanType, setEditingLoanType] = useState(null);
  const [form] = Form.useForm();

  const fetchLoanTypes = async () => {
    try {
      setLoading(true);
      const response = await getLoanTypes();
      setLoanTypes(response.data);
    } catch (error) {
      message.error('Kredi türleri getirilirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoanTypes();
  }, []);

  const handleOpenModal = (loanType = null) => {
    setEditingLoanType(loanType);
    form.setFieldsValue(loanType ? { name: loanType.name } : { name: '' });
    setModalVisible(true);
  };

  const handleCancelModal = () => {
    setModalVisible(false);
    setEditingLoanType(null);
    form.resetFields();
  };

  const handleSaveLoanType = async () => {
    try {
      const values = await form.validateFields();
      if (editingLoanType) {
        await updateLoanType(editingLoanType.id, values);
        message.success('Kredi türü başarıyla güncellendi.');
      } else {
        await createLoanType(values);
        message.success('Kredi türü başarıyla oluşturuldu.');
      }
      fetchLoanTypes();
      handleCancelModal();
    } catch (error) {
      message.error('İşlem sırasında bir hata oluştu.');
    }
  };

  const handleDeleteLoanType = async (id) => {
    try {
      await deleteLoanType(id);
      message.success('Kredi türü başarıyla silindi.');
      fetchLoanTypes();
    } catch (error) {
      message.error('Kredi türü silinirken bir hata oluştu. Bu türde krediler olabilir.');
    }
  };

  const columns = [
    {
      title: 'Kredi Türü Adı',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'İşlemler',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button icon={<EditOutlined />} onClick={() => handleOpenModal(record)}>
            Düzenle
          </Button>
          <Popconfirm
            title="Bu kredi türünü silmek istediğinizden emin misiniz?"
            onConfirm={() => handleDeleteLoanType(record.id)}
            okText="Evet"
            cancelText="Hayır"
          >
            <Button danger icon={<DeleteOutlined />}>
              Sil
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Kredi Türü Yönetimi</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
          Yeni Kredi Türü Ekle
        </Button>
      </div>
      <Spin spinning={loading}>
        <Table
          columns={columns}
          dataSource={loanTypes}
          rowKey="id"
          bordered
        />
      </Spin>
      <Modal
        title={editingLoanType ? 'Kredi Türünü Düzenle' : 'Yeni Kredi Türü Ekle'}
        open={modalVisible}
        onOk={handleSaveLoanType}
        onCancel={handleCancelModal}
        okText="Kaydet"
        cancelText="İptal"
      >
        <Form form={form} layout="vertical" name="loanTypeForm">
          <Form.Item
            name="name"
            label="Kredi Türü Adı"
            rules={[{ required: true, message: 'Lütfen kredi türü adını girin.' }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LoanTypes;
