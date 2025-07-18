import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, Button, message } from 'antd';
import { getBankAccounts, getCardBrands, createCreditCard } from '../../../../api/creditCardService';

const { Option } = Select;

const AddCreditCardModal = ({ visible, onClose, onCardAdded }) => {
  const [form] = Form.useForm();
  const [bankAccounts, setBankAccounts] = useState([]);
  const [cardBrands, setCardBrands] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      // Banka hesaplarını ve kart markalarını getir
      const fetchData = async () => {
        try {
          const accountsRes = await getBankAccounts();
          setBankAccounts(accountsRes.data);
          const brandsRes = await getCardBrands();
          setCardBrands(brandsRes.data);
        } catch (error) {
          message.error('Gerekli veriler yüklenirken bir hata oluştu.');
        }
      };
      fetchData();
    }
  }, [visible]);

  const handleFinish = async (values) => {
    setLoading(true);
    try {
      await createCreditCard(values);
      message.success('Kredi kartı başarıyla eklendi!');
      onCardAdded(); // Kart listesini yenilemek için ana bileşeni bilgilendir
      form.resetFields();
      onClose();
    } catch (error) {
      message.error('Kredi kartı eklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
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
        <Form.Item name="card_brand_id" label="Kart Markası (Visa, Mastercard vb.)" rules={[{ required: true }]}>
          <Select placeholder="Bir kart markası seçin">
            {cardBrands.map(brand => (
              <Option key={brand.id} value={brand.id}>{brand.name}</Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            Kartı Ekle
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddCreditCardModal;
