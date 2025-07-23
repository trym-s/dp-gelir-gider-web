import React, { useState, useEffect } from 'react';
import {
  Card, Button, Modal, Form, Input, InputNumber, DatePicker, Select,
  Row, Col, Typography, message, Popconfirm, Empty, Spin, Tag, Space, Alert, Tooltip, List
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, DollarOutlined, WalletOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import './BankLoans.css';
import { getLoans, createLoan, updateLoan, deleteLoan, getLoanTypes, makePayment, getPaymentsForLoan } from '../../../api/loanService';
import { getBankAccounts } from '../../../api/creditCardService';
import LoanDetail from './LoanDetail';
import LoanPayments from './LoanPayments';

const { Title, Text } = Typography;
const { Option } = Select;

function BankLoans() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [paymentForm] = Form.useForm();
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [expandedLoan, setExpandedLoan] = useState(null);
  const [selectedLoanId, setSelectedLoanId] = useState(null);
  const [isTableExpanded, setIsTableExpanded] = useState(false);

  // Fetching data with useQuery
  const { data: loans = [], isLoading: isLoadingLoans, isError: isErrorLoans } = useQuery({
    queryKey: ['loans'],
    queryFn: getLoans,
    select: (data) => data.data,
  });

  const { data: bankAccounts = [] } = useQuery({ queryKey: ['bankAccounts'], queryFn: () => getBankAccounts().then(res => res.data) });
  const { data: loanTypes = [] } = useQuery({ queryKey: ['loanTypes'], queryFn: () => getLoanTypes().then(res => res.data) });

  // Mutations
  const { mutate: createOrUpdateLoan, isLoading: isSavingLoan } = useMutation({
    mutationFn: (loanData) => {
      if (editMode && selectedLoan) {
        return updateLoan(selectedLoan.id, loanData);
      }
      return createLoan(loanData);
    },
    onSuccess: () => {
      message.success(`Kredi başarıyla ${editMode ? 'güncellendi' : 'eklendi'}.`);
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      if (selectedLoanId) {
        queryClient.invalidateQueries({ queryKey: ['loan', selectedLoanId] });
      }
      setModalOpen(false);
    },
    onError: () => message.error('İşlem sırasında bir hata oluştu.'),
  });

  const { mutate: deleteLoanMutation } = useMutation({
    mutationFn: deleteLoan,
    onSuccess: (_, loanId) => {
      message.success('Kredi başarıyla silindi.');
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      if (loanId === selectedLoanId) {
        setSelectedLoanId(null);
      }
    },
    onError: () => message.error('Kredi silinirken bir hata oluştu.'),
  });

  const handleAddOrEditLoan = () => {
    form.validateFields().then(async (values) => {
      const loanData = {
        ...values,
        date_drawn: values.date_drawn.format('YYYY-MM-DD'),
        monthly_interest_rate: values.monthly_interest_rate,
        bsmv_rate: values.bsmv_rate,
      };
      createOrUpdateLoan(loanData);
    });
  };

  const openModalForEdit = (e, loan) => {
    e.stopPropagation();
    setSelectedLoan(loan);
    setEditMode(true);
    form.setFieldsValue({
      ...loan,
      date_drawn: dayjs(loan.date_drawn),
      monthly_interest_rate: loan.monthly_interest_rate * 100,
      bsmv_rate: loan.bsmv_rate * 100,
    });
    setModalOpen(true);
  };
  
  const openModalForNew = () => {
    setSelectedLoan(null);
    setEditMode(false);
    form.resetFields();
    setModalOpen(true);
  };

  const openPaymentModal = (e, loan) => {
    e.stopPropagation();
    setSelectedLoan(loan);
    paymentForm.resetFields();
    setPaymentModalVisible(true);
  };

  const handleSavePayment = async () => {
    try {
      const values = await paymentForm.validateFields();
      const paymentData = {
        amount_paid: values.amount_paid,
        payment_date: values.payment_date.format('YYYY-MM-DD'),
        payment_type: values.payment_type,
        notes: values.notes,
      };
      
      await makePayment(selectedLoan.id, paymentData);
      message.success(`'${selectedLoan.name}' için ödeme kaydedildi.`);
      setPaymentModalVisible(false);
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['loan', selectedLoan.id] });
    } catch (err) {
      message.error('Ödeme kaydedilirken bir hata oluştu.');
    }
  };

  const handleDelete = (e, loanId) => {
    e.stopPropagation();
    deleteLoanMutation(loanId);
  };

  const toggleExpandLoan = (e, loanId) => {
    e.stopPropagation();
    setExpandedLoan(expandedLoan === loanId ? null : loanId);
  };

  const handleLoanSelect = (loanId) => {
    setSelectedLoanId(loanId);
    setIsTableExpanded(false); // Reset expansion state on new selection
  };

  const renderLoanList = () => {
    if (isLoadingLoans) return <div style={{ textAlign: 'center', margin: '50px 0' }}><Spin tip="Krediler Yükleniyor..." size="large" /></div>;
    if (isErrorLoans) return <Alert message="Krediler yüklenirken bir hata oluştu." type="error" />;
    if (loans.length === 0) return <Empty image={<WalletOutlined />} description="Henüz bir kredi kaydınız bulunmuyor."><Button type="primary" icon={<PlusOutlined />} onClick={openModalForNew}>İlk Kredinizi Ekleyin</Button></Empty>;

    return (
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {loans.map((loan) => (
          <Card 
            key={loan.id} 
            className={`loan-card ${selectedLoanId === loan.id ? 'selected' : ''}`}
            onClick={() => handleLoanSelect(loan.id)}
            hoverable
          >
            <Row align="middle" gutter={[16, 8]}>
              <Col xs={24} sm={24} md={24} lg={6}><Title level={5} style={{ margin: 0 }}>{loan.name}</Title><Space><Text type="secondary">{loan.bank_account.bank.name}</Text><Tag color="blue">{loan.loan_type.name}</Tag></Space></Col>
              <Col xs={24} sm={24} md={24} lg={14}>
                <Space wrap size="large">
                  <Text>
                    <Text type="secondary">Çekilen Anapara: </Text>
                    <Text strong type="success">
                      ₺{parseFloat(loan.amount_drawn).toLocaleString('tr-TR')}
                    </Text>
                  </Text>
                  <Text>
                    <Text type="secondary">Ödenen Taksit: </Text>
                    <Text strong type="primary">
                      {loan.payments_made_count} / {loan.term_months}
                    </Text>
                  </Text>
                </Space>
              </Col>
              <Col xs={24} sm={24} md={24} lg={4} style={{ textAlign: 'right' }}><Space><Tooltip title="Düzenle"><Button icon={<EditOutlined />} onClick={(e) => openModalForEdit(e, loan)} /></Tooltip><Tooltip title="Ödeme Yap"><Button icon={<DollarOutlined />} onClick={(e) => openPaymentModal(e, loan)} /></Tooltip><Tooltip title="Sil"><Popconfirm title="Bu krediyi silmek istediğinizden emin misiniz?" onConfirm={(e) => handleDelete(e, loan.id)} okText="Evet" cancelText="Hayır"><Button danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} /></Popconfirm></Tooltip><Tooltip title={expandedLoan === loan.id ? "Gizle" : "Ödemeleri Göster"}><Button icon={expandedLoan === loan.id ? <UpOutlined /> : <DownOutlined />} onClick={(e) => toggleExpandLoan(e, loan.id)} /></Tooltip></Space></Col>
            </Row>
            {expandedLoan === loan.id && <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}><Title level={5}>Geçmiş Ödemeler</Title><LoanPayments loanId={loan.id} /></div>}
          </Card>
        ))}
      </Space>
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}><Title level={3} style={{ margin: 0 }}>Kredilerim</Title><Button icon={<PlusOutlined />} type="primary" onClick={openModalForNew}>Yeni Kredi Ekle</Button></Row>
      <Row gutter={24}>
        <Col span={24}>{renderLoanList()}</Col>
      </Row>
      <Modal
        open={!!selectedLoanId}
        onCancel={() => {
          setSelectedLoanId(null);
          setIsTableExpanded(false);
        }}
        footer={null}
        width={isTableExpanded ? '80vw' : '450px'}
        title={null}
        destroyOnClose
        bodyStyle={{ padding: 0, transition: 'all 0.3s' }}
        style={{ transition: 'all 0.3s' }}
      >
        {selectedLoanId && <LoanDetail 
          loanId={selectedLoanId} 
          isTableVisible={isTableExpanded}
          onToggleTable={() => setIsTableExpanded(!isTableExpanded)}
        />}
      </Modal>
      <Modal open={modalOpen} title={editMode ? 'Kredi Düzenle' : 'Yeni Kredi Ekle'} onOk={handleAddOrEditLoan} onCancel={() => setModalOpen(false)} okText={editMode ? 'Güncelle' : 'Ekle'} cancelText="İptal" confirmLoading={isSavingLoan} width={800} destroyOnClose>
        <Form form={form} layout="vertical" name="loan_form" initialValues={{ date_drawn: dayjs(), bsmv_rate: 15 }}>
           <Row gutter={16}><Col span={12}><Form.Item label="Banka Hesabı" name="bank_account_id" rules={[{ required: true }]}><Select placeholder="Banka hesabı seçin">{bankAccounts.map((account) => <Option key={account.id} value={account.id}>{account.name} ({account.bank.name})</Option>)}</Select></Form.Item></Col><Col span={12}><Form.Item label="Kredi Türü" name="loan_type_id" rules={[{ required: true }]}><Select placeholder="Kredi türü seçin">{loanTypes.map((type) => <Option key={type.id} value={type.id}>{type.name}</Option>)}</Select></Form.Item></Col></Row>
          <Form.Item label="Kredi Adı" name="name" rules={[{ required: true }]}><Input placeholder="Örn: Ev Kredisi" /></Form.Item>
          <Row gutter={16}><Col span={12}><Form.Item label="Çekilen Toplam Para (₺)" name="amount_drawn" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={0} formatter={val => `₺ ${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={val => val.replace(/₺\s?|(,*)/g, '')} /></Form.Item></Col><Col span={12}><Form.Item label="Vade (Ay)" name="term_months" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={1} /></Form.Item></Col></Row>
          <Row gutter={16}><Col span={8}><Form.Item label="Aylık Faiz Oranı (%)" name="monthly_interest_rate" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} formatter={val => `${val}%`} parser={val => val.replace('%', '')} /></Form.Item></Col><Col span={8}><Form.Item label="BSMV Oranı (%)" name="bsmv_rate" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={0} step={1} precision={0} formatter={val => `${val}%`} parser={val => val.replace('%', '')} /></Form.Item></Col><Col span={8}><Form.Item label="Her Ayın Ödeme Günü" name="payment_due_day" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={1} max={31} /></Form.Item></Col></Row>
          <Row gutter={16}><Col span={12}><Form.Item label="Çekildiği Gün" name="date_drawn" rules={[{ required: true }]}><DatePicker format="DD.MM.YYYY" style={{ width: '100%' }} /></Form.Item></Col><Col span={12}><Form.Item label="Açıklama (Opsiyonel)" name="description"><Input.TextArea rows={1} placeholder="Ek notlar" /></Form.Item></Col></Row>
        </Form>
      </Modal>
      <Modal title="Ödeme Yap" open={paymentModalVisible} onOk={handleSavePayment} onCancel={() => setPaymentModalVisible(false)} okText="Ödemeyi Kaydet" cancelText="İptal" destroyOnClose>
        {selectedLoan && <Alert message={selectedLoan.description} description={`Kalan anapara: ₺${parseFloat(selectedLoan.remaining_principal).toLocaleString('tr-TR')}`} type="info" showIcon style={{ marginBottom: 24 }} />}
        <Form form={paymentForm} layout="vertical">
          <Form.Item label="Ödeme Tutarı" name="amount_paid" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={0} formatter={val => `₺ ${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={val => val.replace(/₺\s?|(,*)/g, '')} /></Form.Item>
          <Form.Item label="Ödeme Tarihi" name="payment_date" initialValue={dayjs()} rules={[{ required: true }]}><DatePicker format="DD.MM.YYYY" style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="payment_type" label="Ödeme Türü" initialValue="REGULAR_INSTALLMENT" rules={[{ required: true }]}><Select><Option value="REGULAR_INSTALLMENT">Normal Taksit</Option><Option value="PREPAYMENT">Ara Ödeme</Option><Option value="SETTLEMENT">Erken Kapama Ödemesi</Option><Option value="OTHER">Diğer</Option></Select></Form.Item>
          <Form.Item label="Notlar" name="notes"><Input.TextArea rows={3} placeholder="Ödeme ile ilgili notlar" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

const queryClient = new QueryClient();

export default function ProvidedBankLoans() {
  return (
    <QueryClientProvider client={queryClient}>
      <BankLoans />
    </QueryClientProvider>
  );
}