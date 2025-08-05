import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  message,
  Space,
  Row,
  Col,
  Tooltip
} from 'antd';
import { getCardBrands, createCreditCard, createCardBrand } from '../../../../api/creditCardService';
import { getBankAccounts } from '../../../../api/bankAccountService';
import { PlusOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import CardBrandIcon from './CardBrandIcon';

const { Option } = Select;

const AddCreditCardModal = ({ visible, onClose, onCardAdded }) => {
  const [form] = Form.useForm();
  const [bankAccounts, setBankAccounts] = useState([]);
  const [cardBrands, setCardBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [cardParts, setCardParts] = useState(['', '', '', '']);
  const [detectedBrandObject, setDetectedBrandObject] = useState(null);

  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  useEffect(() => {
    if (visible) {
      const fetchInitialData = async () => {
        setLoading(true);
        try {
          const [accountsRes, brandsRes] = await Promise.all([getBankAccounts(), getCardBrands()]);
          setBankAccounts(accountsRes.data);
          setCardBrands(brandsRes.data);
        } catch (error) {
          message.error('Gerekli veriler yüklenirken bir hata oluştu.');
        } finally {
          setLoading(false);
        }
      };
      
      fetchInitialData();
      form.resetFields();
      setCardParts(['', '', '', '']);
      setDetectedBrandObject(null);
    }
  }, [visible, form]);

  const handleFinish = async (values) => {
    setLoading(true);
    const submissionValues = {
      ...values,
      expiration_date: `${String(values.expiration_month).padStart(2, '0')}/${String(values.expiration_year).slice(-2)}`,
    };
    
    delete submissionValues.expiration_month;
    delete submissionValues.expiration_year;

    try {
      await createCreditCard(submissionValues);
      message.success('Kredi kartı başarıyla eklendi!');
      onCardAdded();
      onClose();
    } catch (error) {
      console.error('Kredi kartı ekleme hatası:', error);
      message.error('Kredi kartı eklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const runBrandDetection = (fullCardNumber) => {
    let brandNameString = null;
    const cleanNumber = fullCardNumber.replace(/\s/g, '');

    if (cleanNumber.startsWith('4')) brandNameString = 'visa';
    else if (cleanNumber.startsWith('5')) brandNameString = 'mastercard';
    else if (cleanNumber.startsWith('9')) brandNameString = 'troy';
    else if (cleanNumber.startsWith('34') || cleanNumber.startsWith('37')) brandNameString = 'amex';

    if (brandNameString) {
      const foundBrand = cardBrands.find(b => b.name.toLowerCase().includes(brandNameString));
      if (foundBrand) {
        setDetectedBrandObject(foundBrand);
        form.setFieldsValue({ card_brand_id: foundBrand.id });
      }
    } else {
      setDetectedBrandObject(null);
    }
  };

  const handlePartChange = (e, index) => {
    const { value } = e.target;
    const numericValue = value.replace(/[^0-9]/g, '');

    if (numericValue.length > 4) {
        const chunks = numericValue.match(/.{1,4}/g) || [];
        const newParts = ['', '', '', ''];
        for (let i = 0; i < 4; i++) {
            newParts[i] = chunks[i] || '';
        }
        setCardParts(newParts);
        const fullNumber = newParts.join(' ');
        form.setFieldsValue({ credit_card_no: fullNumber });
        runBrandDetection(fullNumber);
        const lastFullIndex = newParts.findIndex(p => p.length < 4);
        if (lastFullIndex !== -1) {
            inputRefs[lastFullIndex]?.current.focus();
        } else {
            inputRefs[3]?.current.focus();
        }
        return;
    }

    const newParts = [...cardParts];
    newParts[index] = numericValue;
    setCardParts(newParts);

    const fullNumber = newParts.join(' ');
    form.setFieldsValue({ credit_card_no: fullNumber.trim() });
    
    runBrandDetection(fullNumber);

    if (numericValue.length === 4 && index < 3) {
      inputRefs[index + 1].current.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && cardParts[index] === '' && index > 0) {
      inputRefs[index - 1].current.focus();
    }
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 15 }, (_, i) => currentYear + i);

  return (
    <>
      <Modal
        title="Yeni Kredi Kartı Ekle"
        open={visible}
        onCancel={onClose}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleFinish} style={{ marginTop: '24px' }}>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="name" label="Kart Adı (İsteğe Bağlı)">
                <Input placeholder="Örn: Axess Platinum, Maaş Kartım" />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item label="Kart Numarası" required>
                <Space.Compact style={{ width: '100%' }}>
                  {cardParts.map((part, index) => (
                    <Input
                      key={index}
                      ref={inputRefs[index]}
                      value={part}
                      onChange={(e) => handlePartChange(e, index)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      maxLength={4}
                      placeholder="----"
                      style={{ textAlign: 'center', width: '25%' }}
                      // +++ ÇÖZÜM BURADA: İkonu sadece son input'un suffix'i olarak ekliyoruz +++
                      suffix={
                        // Sadece son input'a (index'i 3 olan) ikonu ekle
                        index === 3 ? (
                          <CardBrandIcon
                            brand={detectedBrandObject}
                            style={{ fontSize: '24px', color: '#00000040' }}
                          />
                        ) : null
                      }
                    />
                  ))}
                </Space.Compact>
                
                {/* --- ARTIK GEREKLİ DEĞİL: Manuel konumlandırılan div kaldırıldı ---
                <div style={{ position: 'absolute', right: 12, top: 0, ... }}>
                </div>
                */}

                 <Form.Item name="credit_card_no" noStyle rules={[{ required: true, message: 'Kart numarası zorunludur' }, { pattern: /^(\d{4}\s){3}\d{4}$/, message: 'Lütfen 16 haneli kart numarasını girin.'}]}>
                   <Input type="hidden" />
                 </Form.Item>
                 <Form.Item name="card_brand_id" noStyle rules={[{ required: true, message: 'Geçerli bir kart markası girilmelidir.' }]}>
                    <Input type="hidden" />
                 </Form.Item>
              </Form.Item>
            </Col>
            
            <Col xs={24} sm={14}>
              <Form.Item label="Son Kullanma Tarihi" required>
                <Space.Compact style={{ width: '100%' }}>
                  <Form.Item name="expiration_month" noStyle rules={[{ required: true, message: 'Ay seçin' }]}>
                    <Select placeholder="Ay">{Array.from({ length: 12 }, (_, i) => (<Option key={i + 1} value={i + 1}>{String(i + 1).padStart(2, '0')}</Option>))}</Select>
                  </Form.Item>
                  <Form.Item name="expiration_year" noStyle rules={[{ required: true, message: 'Yıl seçin' }]}>
                    <Select placeholder="Yıl">{yearOptions.map(year => <Option key={year} value={year}>{year}</Option>)}</Select>
                  </Form.Item>
                </Space.Compact>
              </Form.Item>
            </Col>
            <Col xs={24} sm={10}>
              <Form.Item name="cvc" label="CVC" rules={[{ required: true, message: 'CVC zorunludur' }]}>
                <Input.Password placeholder="•••" maxLength={4} addonAfter={<Tooltip title="Kartınızın arkasındaki 3 veya 4 haneli güvenlik kodu"><QuestionCircleOutlined style={{ cursor: 'pointer' }}/></Tooltip>} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="statement_day" label="Hesap Kesim Günü" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={1} max={31} placeholder="Ayın günü (1-31)" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="due_day" label="Son Ödeme Günü" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={1} max={31} placeholder="Ayın günü (1-31)" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="limit" label="Kart Limiti" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} placeholder="₺50,000" formatter={value => `₺ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => value.replace(/₺\s?|(,*)/g, '')} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="bank_account_id" label="Bağlı Banka Hesabı" rules={[{ required: true }]}>
                <Select placeholder="Bir banka hesabı seçin" loading={loading}>{bankAccounts.map(account => (<Option key={account.id} value={account.id}>{account.name} ({account.bank.name})</Option>))}</Select>
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" htmlType="submit" loading={loading} block size="large">Kredi Kartını Kaydet</Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
};

export default AddCreditCardModal;
