import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Row,
  Col,
  Typography,
  message,
  Popconfirm,
  Empty,
  Spin,
  Tag,
  Space,
  Alert,
  Tooltip
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  DollarOutlined,
  WalletOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import './BankLoans.css';
import { getLoans, createLoan, updateLoan, deleteLoan, getLoanTypes } from '../../../api/loanService';
import { getBankAccounts } from '../../../api/creditCardService';

const { Title, Text } = Typography;
const { Option } = Select;

export default function BankLoans() {
  const [loans, setLoans] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [paymentForm] = Form.useForm();
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loanTypes, setLoanTypes] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const response = await getLoans();
      setLoans(response.data);
    } catch (error) {
      message.error('Krediler getirilirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const fetchInitialData = async () => {
    try {
      const [loanTypesRes, bankAccountsRes] = await Promise.all([
        getLoanTypes(),
        getBankAccounts(),
      ]);
      setLoanTypes(loanTypesRes.data);
      setBankAccounts(bankAccountsRes.data);
    } catch (error) {
      message.error('Gerekli veriler yüklenirken bir hata oluştu.');
    }
  };

  useEffect(() => {
    fetchLoans();
    fetchInitialData();
  }, []);

  const handleAddOrEditLoan = () => {
    form
      .validateFields()
      .then(async (values) => {
        setLoading(true);
        const loanData = {
          ...values,
          date_drawn: values.date_drawn.format('YYYY-MM-DD'),
          remaining_principal: values.amount_drawn,
          name: values.description,
        };
        try {
          if (editMode && selectedLoan) {
            await updateLoan(selectedLoan.id, loanData);
            message.success('Kredi başarıyla güncellendi.');
          } else {
            await createLoan(loanData);
            message.success('Kredi başarıyla eklendi.');
          }
          fetchLoans();
          setModalOpen(false);
        } catch (error) {
          message.error('İşlem sırasında bir hata oluştu.');
        } finally {
          setLoading(false);
        }
      })
      .catch((errorInfo) => {
        console.warn('Form doğrulama hatası:', errorInfo);
      });
  };

  const openModalForEdit = (loan) => {
    setSelectedLoan(loan);
    setEditMode(true);
    form.setFieldsValue({
      ...loan,
      date_drawn: dayjs(loan.date_drawn),
    });
    setModalOpen(true);
  };
  
  const openModalForNew = () => {
    setSelectedLoan(null);
    setEditMode(false);
    form.resetFields();
    setModalOpen(true);
  };

  const openPaymentModal = (loan) => {
    setSelectedLoan(loan);
    paymentForm.resetFields();
    setPaymentModalVisible(true);
  };

  const handleSavePayment = async () => {
    try {
      const values = await paymentForm.validateFields();
      // Ödeme API çağrısı burada yapılacak. Şimdilik sadece mesaj gösteriliyor.
      console.log('Ödeme bilgileri:', values);
      message.success(`'${selectedLoan.description}' için ödeme kaydedildi.`);
      setPaymentModalVisible(false);
    } catch (err) {
      console.warn('Ödeme formu hatası:', err);
    }
  };

  const handleDelete = async (loanId) => {
    try {
      setLoading(true);
      await deleteLoan(loanId);
      message.success('Kredi başarıyla silindi.');
      fetchLoans();
    } catch (error) {
      message.error('Kredi silinirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const renderLoanList = () => {
    if (loading) {
      return <div style={{ textAlign: 'center', margin: '50px 0' }}><Spin tip="Krediler Yükleniyor..." size="large" /></div>;
    }

    if (loans.length === 0) {
      return (
        <Empty
          image={<WalletOutlined style={{ fontSize: 64, color: '#ccc' }} />}
          description={<Text type="secondary">Henüz bir kredi kaydınız bulunmuyor.</Text>}
        >
          <Button type="primary" icon={<PlusOutlined />} onClick={openModalForNew}>
            İlk Kredinizi Ekleyin
          </Button>
        </Empty>
      );
    }

    return (
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {loans.map((loan) => (
          <Card key={loan.id} className="loan-card loan-list-enter-active">
            <Row align="middle" gutter={[16, 8]}>
              <Col xs={24} sm={8} md={6}>
                <Title level={5} style={{ margin: 0 }}>{loan.description}</Title>
                <Space>
                  <Text type="secondary">{loan.bank_account.bank.name}</Text>
                  <Tag color="blue">{loan.loan_type.name}</Tag>
                </Space>
              </Col>
              
              <Col xs={24} sm={12} md={14}>
                <Space wrap size="large">
                  <Text><Text type="secondary">Kullanım Miktarı: </Text><Text strong>₺{parseFloat(loan.amount_drawn).toLocaleString('tr-TR')}</Text></Text>
                  <Text><Text type="secondary">Kalan Anapara: </Text><Text strong type="success">₺{parseFloat(loan.remaining_principal).toLocaleString('tr-TR')}</Text></Text>
                  <Text><Text type="secondary">Vade: </Text><Text strong>{loan.term_months} Ay</Text></Text>
                  <Text><Text type="secondary">Aylık Faiz: </Text><Text strong>%{loan.monthly_interest_rate}</Text></Text>
                  <Text><Text type="secondary">Yıllık Faiz: </Text><Text strong>%{loan.annual_interest_rate}</Text></Text>
                </Space>
              </Col>

              <Col xs={24} sm={4} md={4} style={{ textAlign: 'right' }}>
                <Space>
                  <Tooltip title="Düzenle">
                    <Button icon={<EditOutlined />} onClick={() => openModalForEdit(loan)} />
                  </Tooltip>
                  <Tooltip title="Ödeme Yap">
                    <Button icon={<DollarOutlined />} onClick={() => openPaymentModal(loan)} />
                  </Tooltip>
                  <Tooltip title="Sil">
                    <Popconfirm
                      title="Bu krediyi silmek istediğinizden emin misiniz?"
                      onConfirm={() => handleDelete(loan.id)}
                      okText="Evet"
                      cancelText="Hayır"
                    >
                      <Button danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Tooltip>
                </Space>
              </Col>
            </Row>
          </Card>
        ))}
      </Space>
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Kredilerim</Title>
        <Button icon={<PlusOutlined />} type="primary" onClick={openModalForNew}>
          Yeni Kredi Ekle
        </Button>
      </Row>

      {renderLoanList()}

      <Modal
        open={modalOpen}
        title={editMode ? 'Kredi Düzenle' : 'Yeni Kredi Ekle'}
        onOk={handleAddOrEditLoan}
        onCancel={() => setModalOpen(false)}
        okText={editMode ? 'Güncelle' : 'Ekle'}
        cancelText="İptal"
        confirmLoading={loading}
        width={800}
        destroyOnClose
      >
        <Form form={form} layout="vertical" name="loan_form" initialValues={{ date_drawn: dayjs() }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Banka Hesabı" name="bank_account_id" rules={[{ required: true, message: 'Lütfen bir banka hesabı seçin.' }]}>
                <Select placeholder="Banka hesabı seçin">
                  {bankAccounts.map((account) => <Option key={account.id} value={account.id}>{account.name} ({account.bank.name})</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Kredi Türü" name="loan_type_id" rules={[{ required: true, message: 'Lütfen bir kredi türü seçin.' }]}>
                <Select placeholder="Kredi türü seçin">
                  {loanTypes.map((type) => <Option key={type.id} value={type.id}>{type.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Açıklama" name="description" rules={[{ required: true, message: 'Lütfen bir açıklama girin.' }]}>
            <Input placeholder="Örn: Ev Kredisi" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Kullanım Miktarı (₺)" name="amount_drawn" rules={[{ required: true, message: 'Lütfen kredi tutarını girin.' }]}>
                <InputNumber style={{ width: '100%' }} min={0} formatter={val => `₺ ${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={val => val.replace(/₺\s?|(,*)/g, '')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Vade (Ay)" name="term_months" rules={[{ required: true, message: 'Lütfen vadeyi girin.' }]}>
                <InputNumber style={{ width: '100%' }} min={1} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Aylık Faiz Oranı (%)" name="monthly_interest_rate" rules={[{ required: true, message: 'Lütfen aylık faiz oranını girin.' }]}>
                <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Yıllık Faiz Oranı (%)" name="annual_interest_rate" rules={[{ required: true, message: 'Lütfen yıllık faiz oranını girin.' }]}>
                <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Çekildiği Gün" name="date_drawn" rules={[{ required: true, message: 'Lütfen kredinin çekildiği tarihi seçin.' }]}>
            <DatePicker format="DD.MM.YYYY" style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Ödeme Yap"
        open={paymentModalVisible}
        onOk={handleSavePayment}
        onCancel={() => setPaymentModalVisible(false)}
        okText="Ödemeyi Kaydet"
        cancelText="İptal"
        destroyOnClose
      >
        {selectedLoan && (
          <Alert
            message={selectedLoan.description}
            description={`Kalan anapara: ₺${parseFloat(selectedLoan.remaining_principal).toLocaleString('tr-TR')}`}
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}
        <Form form={paymentForm} layout="vertical">
          <Form.Item
            label="Ödeme Tutarı"
            name="paymentAmount"
            rules={[{ required: true, message: 'Lütfen ödeme tutarını girin.' }]}
          >
            <InputNumber style={{ width: '100%' }} min={0} formatter={val => `₺ ${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={val => val.replace(/₺\s?|(,*)/g, '')} />
          </Form.Item>
          <Form.Item
            label="Ödeme Tarihi"
            name="paymentDate"
            initialValue={dayjs()}
            rules={[{ required: true, message: 'Lütfen ödeme tarihini seçin.' }]}
          >
            <DatePicker format="DD.MM.YYYY" style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}