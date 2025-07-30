import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, Button, message } from 'antd';
import { getCardBrands, updateCreditCard } from '../../../../api/creditCardService';
import { getBankAccounts } from '../../../../api/bankAccountService';

const { Option } = Select;

const EditCreditCardModal = ({ visible, onClose, onCardUpdated, card }) => {
  const [form] = Form.useForm();
  const [bankAccounts, setBankAccounts] = useState([]);
  const [cardBrands, setCardBrands] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      form.setFieldsValue(card); // Formu mevcut kart verileriyle doldur
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
  }, [visible, card, form]);

  const handleFinish = async (values) => {
    setLoading(true);
    try {
      await updateCreditCard(card.id, values);
      message.success('Kredi kartı başarıyla güncellendi!');
      onCardUpdated();
      onClose();
    } catch (error) {
      message.error('Kredi kartı güncellenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Kredi Kartını Düzenle"
      open={visible}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} style={{ marginTop: '24px' }}>
        <Form.Item name="name" label="Kart Adı" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="limit" label="Kart Limiti" rules={[{ required: true }]}>
          <InputNumber style={{ width: '100%' }} min={0} />
        </Form.Item>
        <Form.Item name="statement_day" label="Hesap Kesim Günü" rules={[{ required: true }]}>
          <InputNumber style={{ width: '100%' }} min={1} max={31} />
        </Form.Item>
        <Form.Item name="due_day" label="Son Ödeme Günü" rules={[{ required: true }]}>
          <InputNumber style={{ width: '100%' }} min={1} max={31} />
        </Form.Item>
        <Form.Item name="bank_account_id" label="Bağlı Banka Hesabı" rules={[{ required: true }]}>
          <Select>
            {bankAccounts.map(account => (
              <Option key={account.id} value={account.id}>{account.name} ({account.bank.name})</Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="card_brand_id" label="Kart Markası" rules={[{ required: true }]}>
          <Select>
            {cardBrands.map(brand => (
              <Option key={brand.id} value={brand.id}>{brand.name}</Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            Değişiklikleri Kaydet
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditCreditCardModal;
