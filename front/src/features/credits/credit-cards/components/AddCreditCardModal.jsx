import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, Button, message, Space } from 'antd';
import { getBankAccounts, getCardBrands, createCreditCard, createCardBrand } from '../../../../api/creditCardService';
import { PlusOutlined } from '@ant-design/icons';

const { Option } = Select;

const AddCreditCardModal = ({ visible, onClose, onCardAdded }) => {
  const [form] = Form.useForm();
  const [bankAccounts, setBankAccounts] = useState([]);
  const [cardBrands, setCardBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addBrandModalVisible, setAddBrandModalVisible] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');

  const fetchCardBrands = async () => {
    try {
      const brandsRes = await getCardBrands();
      setCardBrands(brandsRes.data);
    } catch (error) {
      message.error('Kart markaları yüklenirken bir hata oluştu.');
    }
  };

  useEffect(() => {
    if (visible) {
      const fetchInitialData = async () => {
        try {
          const accountsRes = await getBankAccounts();
          setBankAccounts(accountsRes.data);
          await fetchCardBrands();
        } catch (error) {
          message.error('Gerekli veriler yüklenirken bir hata oluştu.');
        }
      };
      fetchInitialData();
    }
  }, [visible]);

  const handleFinish = async (values) => {
    setLoading(true);
    try {
      await createCreditCard(values);
      message.success('Kredi kartı başarıyla eklendi!');
      onCardAdded();
      form.resetFields();
      onClose();
    } catch (error) {
      message.error('Kredi kartı eklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBrand = async () => {
    if (!newBrandName.trim()) {
      message.warning('Marka adı boş olamaz.');
      return;
    }
    try {
      const newBrand = await createCardBrand({ name: newBrandName });
      message.success('Yeni kart markası başarıyla eklendi!');
      setCardBrands([...cardBrands, newBrand.data]);
      form.setFieldsValue({ card_brand_id: newBrand.data.id });
      setAddBrandModalVisible(false);
      setNewBrandName('');
    } catch (error) {
      message.error('Marka eklenirken bir hata oluştu.');
    }
  };

  return (
    <>
      <Modal
        title="Yeni Kredi Kartı Ekle"
        open={visible}
        onCancel={onClose}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleFinish} style={{ marginTop: '24px' }}>
          <Form.Item name="name" label="Kart Adı" rules={[{ required: true }]}>
            <Input placeholder="Örn: Axess Platinum" />
          </Form.Item>
          <Form.Item name="limit" label="Kart Limiti" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} placeholder="50000" />
          </Form.Item>
          <Form.Item name="statement_day" label="Hesap Kesim Günü" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={1} max={31} placeholder="Ayın 26'sı için 26 girin" />
          </Form.Item>
          <Form.Item name="due_day" label="Son Ödeme Günü" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={1} max={31} placeholder="Ayın 5'i için 5 girin" />
          </Form.Item>
          <Form.Item name="bank_account_id" label="Bağlı Banka Hesabı" rules={[{ required: true }]}>
            <Select placeholder="Bir banka hesabı seçin">
              {bankAccounts.map(account => (
                <Option key={account.id} value={account.id}>{account.name} ({account.bank.name})</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="Kart Markası (Visa, Mastercard vb.)">
            <Space.Compact style={{ width: '100%' }}>
              <Form.Item
                name="card_brand_id"
                noStyle
                rules={[{ required: true, message: 'Lütfen bir kart markası seçin!' }]}
              >
                <Select placeholder="Bir kart markası seçin" style={{ width: 'calc(100% - 32px)' }}>
                  {cardBrands.map(brand => (
                    <Option key={brand.id} value={brand.id}>{brand.name}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Button icon={<PlusOutlined />} onClick={() => setAddBrandModalVisible(true)} />
            </Space.Compact>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Kartı Ekle
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Yeni Kart Markası Ekle"
        open={addBrandModalVisible}
        onCancel={() => setAddBrandModalVisible(false)}
        onOk={handleCreateBrand}
        okText="Kaydet"
        cancelText="İptal"
      >
        <Input
          placeholder="Yeni marka adı"
          value={newBrandName}
          onChange={(e) => setNewBrandName(e.target.value)}
        />
      </Modal>
    </>
  );
};

export default AddCreditCardModal;
