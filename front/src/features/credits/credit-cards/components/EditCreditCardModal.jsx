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
import { deleteCreditCard, updateCreditCard } from '../../../../api/creditCardService';
import { getBankAccounts } from '../../../../api/bankAccountService';
import { getCardBrands } from '../../../../api/creditCardService';
import { PlusOutlined, QuestionCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import CardBrandIcon from './CardBrandIcon';

const { Option } = Select;

const EditCreditCardModal = ({ visible, onClose, onCardUpdated, card }) => {
  const [modal, contextHolder] = Modal.useModal();
  const [form] = Form.useForm();
  const [bankAccounts, setBankAccounts] = useState([]);
  const [cardBrands, setCardBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // "Ekle" ekranındaki tüm state'ler artık burada da var
  const [cardParts, setCardParts] = useState(['', '', '', '']);
  const [detectedBrandObject, setDetectedBrandObject] = useState(null);
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  // Mevcut kart verilerini yeni ve modern forma doldurmak için anahtar useEffect
  useEffect(() => {
    if (visible && card) {
      // 1. Gerekli verileri (bankalar, markalar) çek
      const fetchInitialData = async () => {
        setLoading(true);
        try {
          const [accountsRes, brandsRes] = await Promise.all([getBankAccounts(), getCardBrands()]);
          setBankAccounts(accountsRes.data);
          setCardBrands(brandsRes.data);
          
          // Markalar yüklendikten sonra mevcut kartın markasını tespit et ve ayarla
          runBrandDetection(card.credit_card_no, brandsRes.data);

        } catch (error) {
          message.error('Gerekli veriler yüklenirken bir hata oluştu.');
        } finally {
          setLoading(false);
        }
      };
      fetchInitialData();

      // 2. Formun temel alanlarını doldur
      form.setFieldsValue(card);

      // 3. Kart numarasını parçalara ayır ve 4'lü input state'ini doldur
      if (card.credit_card_no) {
        const initialParts = card.credit_card_no.replace(/\s/g, '').match(/.{1,4}/g) || [];
        setCardParts(initialParts.slice(0, 4).map(p => p.padEnd(4, ' ')).map(p=> p.trim())); // Boşlukları temizleyip tekrar set et
      }

      // 4. Son kullanma tarihini (örn: "12/28") parçala ve Ay/Yıl dropdown'larını doldur
      if (card.expiration_date && card.expiration_date.includes('/')) {
        const [month, yearSuffix] = card.expiration_date.split('/');
        // Yıl son ekini tam yıla çevir (örn: "28" -> 2028)
        const fullYear = parseInt(`20${yearSuffix}`);
        form.setFieldsValue({
          expiration_month: parseInt(month),
          expiration_year: fullYear,
        });
      }
      
      // CVC alanı güvenlik nedeniyle asla doldurulmaz, kullanıcı isterse yeniden girer.
      form.setFieldsValue({ cvc: '' });

    }
  }, [visible, card, form]);


  const handleDelete = () => {
    modal.confirm({
      title: 'Kredi Kartını Silmek İstediğinizden Emin misiniz?',
      content: 'Bu işlem geri alınamaz ve kartla ilişkili tüm veriler kalıcı olarak silinir. Bu, potansiyel olarak raporlarınızı ve geçmiş verilerinizi etkileyebilir.',
      okText: 'Evet, Sil',
      okType: 'danger',
      cancelText: 'İptal',
      onOk: async () => {
        setLoading(true);
        try {
          await deleteCreditCard(card.id);
          message.success('Kredi kartı başarıyla silindi.');
          onCardUpdated(); // Refresh the list
          onClose();
        } catch (error) {
          console.error('Kredi kartı silinirken hata:', error);
          message.error('Kredi kartı silinirken bir hata oluştu.');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleFinish = async (values) => {
    setLoading(true);
    const submissionValues = {
      ...values,
      expiration_date: `${String(values.expiration_month).padStart(2, '0')}/${String(values.expiration_year).slice(-2)}`,
      credit_card_no: cardParts.join(' '),
    };
    delete submissionValues.expiration_month;
    delete submissionValues.expiration_year;

    // CVC girilmediyse, güncelleme verisine ekleme
    if (!submissionValues.cvc) {
      delete submissionValues.cvc;
    }

    try {
      // API ÇAĞRISI: "create" yerine "update" kullanılıyor
      await updateCreditCard(card.id, submissionValues);
      message.success('Kredi kartı başarıyla güncellendi!');
      onCardUpdated();
      onClose();
    } catch (error) {
      console.error('Kredi kartı güncelleme hatası:', error);
      message.error('Kredi kartı güncellenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Marka tespit fonksiyonu (marka listesini parametre olarak alacak şekilde güncellendi)
  const runBrandDetection = (fullCardNumber, brands) => {
    let brandNameString = null;
    const cleanNumber = (fullCardNumber || '').replace(/\s/g, '');

    if (cleanNumber.startsWith('4')) brandNameString = 'visa';
    else if (cleanNumber.startsWith('5')) brandNameString = 'mastercard';
    // ... diğer markalar

    if (brandNameString && brands) {
      const foundBrand = brands.find(b => b.name.toLowerCase().includes(brandNameString));
      if (foundBrand) {
        setDetectedBrandObject(foundBrand);
        form.setFieldsValue({ card_brand_id: foundBrand.id });
      }
    } else {
      setDetectedBrandObject(card?.card_brand || null);
    }
  };

  // Parçalı input yönetimi (Add modal ile aynı)
  const handlePartChange = (e, index) => {
    // ... (Add modal'daki kodun aynısı)
    const { value } = e.target;
    const numericValue = value.replace(/[^0-9]/g, '');

    const newParts = [...cardParts];
    newParts[index] = numericValue;
    setCardParts(newParts);

    const fullNumber = newParts.join(' ');
    form.setFieldsValue({ credit_card_no: fullNumber.trim() });
    
    runBrandDetection(fullNumber, cardBrands);

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

  if (!card) return null;

  return (
    <>
      {contextHolder}
      <Modal
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Kredi Kartını Düzenle</span>
            <Tooltip title="Bu kartı kalıcı olarak sil">
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleDelete}
                loading={loading}
              >
                Sil
              </Button>
            </Tooltip>
          </div>
        }
        open={visible}
        onCancel={onClose}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleFinish} style={{ marginTop: '24px' }}>
          <Row gutter={16}>
            {/* TÜM FORM ELEMANLARI ADD MODAL İLE AYNI */}
            <Col span={24}>
              <Form.Item name="name" label="Kart " rules={[{ required: true }]}>
                <Input />
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
                      suffix={index === 3 ? (<CardBrandIcon brand={detectedBrandObject} style={{ fontSize: '24px', color: '#00000040' }}/>) : null}
                    />
                  ))}
                </Space.Compact>
                 <Form.Item name="credit_card_no" noStyle rules={[{ required: true, message: 'Kart numarası zorunludur' }]}><Input type="hidden" /></Form.Item>
                 <Form.Item name="card_brand_id" noStyle rules={[{ required: true, message: 'Geçerli bir kart markası girilmelidir.' }]}><Input type="hidden" /></Form.Item>
              </Form.Item>
            </Col>
            
            <Col xs={24} sm={14}>
              <Form.Item label="Son Kullanma Tarihi" required>
                <Space.Compact style={{ width: '100%' }}>
                  <Form.Item name="expiration_month" noStyle rules={[{ required: true }]}><Select placeholder="Ay">{Array.from({ length: 12 }, (_, i) => (<Option key={i + 1} value={i + 1}>{String(i + 1).padStart(2, '0')}</Option>))}</Select></Form.Item>
                  <Form.Item name="expiration_year" noStyle rules={[{ required: true }]}><Select placeholder="Yıl">{yearOptions.map(year => <Option key={year} value={year}>{year}</Option>)}</Select></Form.Item>
                </Space.Compact>
              </Form.Item>
            </Col>

            <Col xs={24} sm={10}>
                {/* CVC alanı düzenlemede zorunlu değil */}
              <Form.Item name="cvc" label="Yeni CVC (İsteğe Bağlı)">
                <Input.Password placeholder="•••" maxLength={4} />
              </Form.Item>
            </Col>
            
            {/* Diğer alanlar... */}
             <Col xs={24} sm={12}>
              <Form.Item name="statement_day" label="Hesap Kesim Günü" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={1} max={31} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="due_day" label="Son Ödeme Günü" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={1} max={31} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="limit" label="Kart Limiti" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} formatter={value => `₺ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => value.replace(/₺\s?|(,*)/g, '')} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="bank_account_id" label="Bağlı Banka Hesabı" rules={[{ required: true }]}>
                <Select>{bankAccounts.map(account => (<Option key={account.id} value={account.id}>{account.name} ({account.bank.name})</Option>))}</Select>
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" htmlType="submit" loading={loading} block size="large">Değişiklikleri Kaydet</Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
};

export default EditCreditCardModal;
