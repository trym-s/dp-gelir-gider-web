import React, { useState } from 'react';
import {
  Modal, Form, Input, InputNumber, DatePicker, Select,
  Row, Col, Typography, message, Empty, Spin, Tag, Alert, Statistic, Collapse, Button, Divider
} from 'antd';
import { PlusOutlined, WalletOutlined, ScheduleOutlined, PercentageOutlined, CheckCircleOutlined, ExclamationCircleOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import './BankLoans.css';
import { getLoans, createLoan, updateLoan, deleteLoan, getLoanTypes, getAmortizationSchedule } from '../../../api/loanService';
import { getBankAccounts } from '../../../api/bankAccountService';
import ExpandedLoanView from './ExpandedLoanView';
import PaidInstallmentsStatistic from './PaidInstallmentsStatistic';

const { Title, Text } = Typography;
const { Option } = Select;
const { Panel } = Collapse;

const currencyFormatter = (value) => {
  const number = parseFloat(value);
  if (isNaN(number)) return '₺0,00';
  return `₺${number.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const statusConfig = {
  ACTIVE: { color: 'blue', text: 'Aktif', icon: <ExclamationCircleOutlined /> },
  PAID_IN_FULL: { color: 'green', text: 'Tamamen Ödendi', icon: <CheckCircleOutlined /> },
  OVERDUE: { color: 'red', text: 'Vadesi Geçmiş', icon: <ExclamationCircleOutlined /> },
  PENDING_APPROVAL: { color: 'gold', text: 'Onay Bekliyor', icon: <ScheduleOutlined /> },
  DEFAULTED: { color: 'volcano', text: 'Takibe Düştü', icon: <ExclamationCircleOutlined /> },
};

function BankLoans({ showAddButton = true }) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [activeKey, setActiveKey] = useState(null);
  const [completedActiveKey, setCompletedActiveKey] = useState(null);

  const { data: loans = [], isLoading: isLoadingLoans, isError: isErrorLoans } = useQuery({
    queryKey: ['loans'],
    queryFn: getLoans,
    select: (response) => response.data || []
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bankAccounts'],
    queryFn: getBankAccounts,
    select: (response) => response.data || []
  });

  const { data: loanTypes = [] } = useQuery({
    queryKey: ['loanTypes'],
    queryFn: getLoanTypes,
    select: (response) => response.data || []
  });;



  const { mutate: createOrUpdateLoan, isLoading: isSavingLoan } = useMutation({
    mutationFn: (loanData) => editMode ? updateLoan(selectedLoan.id, loanData) : createLoan(loanData),
    onSuccess: () => {
      message.success(`Kredi başarıyla ${editMode ? 'güncellendi' : 'eklendi'}.`);
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      setModalOpen(false);
    },
    onError: () => message.error('İşlem sırasında bir hata oluştu.'),
  });

  const handleAddOrEditLoan = () => {
    form.validateFields().then(values => {
      const loanData = {
        ...values,
        date_drawn: values.date_drawn.format('YYYY-MM-DD'),
      };
      createOrUpdateLoan(loanData);
    });
  };

  const openModalForNew = () => {
    setSelectedLoan(null);
    setEditMode(false);
    form.resetFields();
    setModalOpen(true);
  };

  const renderLoanList = () => {
    if (isLoadingLoans) return <div style={{ textAlign: 'center', margin: '50px 0' }}><Spin tip="Krediler Yükleniyor..." size="large" /></div>;
    if (isErrorLoans) return <Alert message="Krediler yüklenirken bir hata oluştu." type="error" />;

    // 1. Adım: Kredileri aktif ve biten olarak ayır
    const activeLoans = loans.filter(loan => loan.status !== 'PAID_IN_FULL');
    const completedLoans = loans.filter(loan => loan.status === 'PAID_IN_FULL');

    if (loans.length === 0) return <Empty image={<WalletOutlined />} description="Henüz bir kredi kaydınız bulunmuyor."><Button type="primary" icon={<PlusOutlined />} onClick={openModalForNew}>İlk Kredinizi Ekleyin</Button></Empty>;

    // 2. Adım: Her iki listeyi de ayrı ayrı render et
    return (
      <>
        {/* Aktif Krediler Bölümü */}
        {activeLoans.length > 0 && (
          <Collapse accordion activeKey={activeKey} onChange={(key) => setActiveKey(key)} className="loan-collapse">
            {activeLoans.map((loan) => {
              const currentStatus = statusConfig[loan.status] || statusConfig.ACTIVE;
              const isActive = Array.isArray(activeKey) ? activeKey[0] === String(loan.id) : activeKey === String(loan.id);
              const percent = loan.amount_drawn > 0 ? Math.round(((loan.amount_drawn - loan.remaining_principal) / loan.amount_drawn) * 100) : 0;

              const totalDebt = loan.monthly_payment_amount * loan.term_months;
              const remainingDebt = totalDebt - (loan.total_paid || 0);

              const header = (
                <div className="loan-header-content">
                  {/* Header içeriği orijinal haliyle aynı... */}
                  <div className="loan-info">
                    <Title level={5} style={{ margin: 0 }}>{loan.name}</Title>
                    <Text type="secondary">{loan.bank_account.bank.name}</Text>
                  </div>
                  <div className="loan-stats">
                    <div className="statistic-item">
                      <Statistic title="Kalan Borç" value={remainingDebt} formatter={currencyFormatter} />
                      <Text type="secondary" style={{ fontSize: '12px', display: 'block', textAlign: 'right' }}>
                        Toplam: {currencyFormatter(totalDebt)}
                      </Text>
                    </div>
                    <div className="statistic-item">
                      <Statistic title="Kalan Anapara" value={loan.remaining_principal} formatter={currencyFormatter} />
                      <Text type="secondary" style={{ fontSize: '12px', display: 'block', textAlign: 'right' }}>
                        Toplam: {currencyFormatter(loan.amount_drawn)}
                      </Text>
                    </div>
                    <Statistic title="Aylık Taksit" value={loan.monthly_payment_amount} formatter={currencyFormatter} />
                  </div>
                  <div className="loan-details">
                    <div className="progress-wrapper">
                      <div className="progress-bar-container">
                        <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
                      </div>
                      <Text className="progress-text">{percent}%</Text>
                    </div>
                    <div className="loan-tags">
                      <PaidInstallmentsStatistic loanId={loan.id} />
                      <Tag icon={<PercentageOutlined />} color="purple">{(loan.monthly_interest_rate * 100).toFixed(2)}%</Tag>
                      <Tag color="blue">Vade Süresi {loan.term_months}</Tag>
                      <Tag icon={currentStatus.icon} color={currentStatus.color}>{currentStatus.text}</Tag>
                    </div>
                  </div>
                  <div className="expand-indicator">
                    {isActive ? <UpOutlined /> : <DownOutlined />}
                  </div>
                </div>
              );

              return (
                <Panel header={header} key={loan.id} showArrow={false} className="loan-panel">
                  {/* ExpandedLoanView gibi iç bileşenler sorunsuz çalışmaya devam eder */}
                  <ExpandedLoanView loanId={loan.id} isActive={isActive} />
                </Panel>
              );
            })}
          </Collapse>
        )}

        {/* Biten Krediler Bölümü */}
        {completedLoans.length > 0 && (
          <>
            <Divider />
            <Title level={4} style={{ marginBottom: 16 }}>Ödemesi Biten Krediler</Title>
            <Collapse accordion activeKey={completedActiveKey} onChange={(key) => setCompletedActiveKey(key)} className="loan-collapse">
              {completedLoans.map((loan) => {
                const currentStatus = statusConfig[loan.status] || statusConfig.PAID_IN_FULL;
                // Biten krediler için 'isActive' durumunu yeni state'imizle kontrol ediyoruz
                const isActive = Array.isArray(completedActiveKey) ? completedActiveKey[0] === String(loan.id) : completedActiveKey === String(loan.id);

                const header = (
                  <div className="loan-header-content">
                    <div className="loan-info">
                      <Title level={5} style={{ margin: 0 }}>{loan.name}</Title>
                      <Text type="secondary">{loan.bank_account?.bank?.name}</Text>
                    </div>
                    <div className="loan-stats">
                      <Statistic title="Toplam Ödenen" value={loan.amount_drawn} formatter={currencyFormatter} />
                      <Statistic title="Vade" value={`${loan.term_months} Ay`} />
                    </div>
                    <div className="loan-details">
                      <div className="loan-tags">
                        <Tag icon={currentStatus.icon} color={currentStatus.color}>{currentStatus.text}</Tag>
                      </div>
                    </div>
                    <div className="expand-indicator">
                      {isActive ? <UpOutlined /> : <DownOutlined />}
                    </div>
                  </div>
                );

                return (
                  <Panel header={header} key={loan.id} showArrow={false} className="loan-panel loan-panel-completed">
                    {/* DEĞİŞİKLİK: Basit metin yerine ExpandedLoanView eklendi */}
                    <ExpandedLoanView loanId={loan.id} isActive={isActive} />
                  </Panel>
                );
              })}
            </Collapse>
          </>
        )}
      </>
    );
  };
  return (
    <div style={{ padding: 24, backgroundColor: '#f9fafb' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Kredilerim</Title>
        {showAddButton && (
          <Button icon={<PlusOutlined />} type="primary" onClick={openModalForNew}>
            Yeni Kredi Ekle
          </Button>
        )}
      </Row>

      {renderLoanList()}

      <Modal
        open={modalOpen}
        title={editMode ? 'Kredi Düzenle' : 'Yeni Kredi Ekle'}
        onOk={handleAddOrEditLoan}
        onCancel={() => setModalOpen(false)}
        okText={editMode ? 'Güncelle' : 'Ekle'}
        cancelText="İptal"
        confirmLoading={isSavingLoan}
        width={800}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          name="loan_form"
          initialValues={{ date_drawn: dayjs(), bsmv_rate: 15 }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Banka Hesabı"
                name="bank_account_id"
                rules={[{ required: true, message: 'Lütfen bir banka hesabı seçin.' }]}
              >
                <Select placeholder="Banka hesabı seçin">
                  {bankAccounts.map((account) => (
                    <Option key={account.id} value={account.id}>
                      {account.name} ({account.bank.name})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="Kredi Türü"
                name="loan_type_id"
                rules={[{ required: true, message: 'Lütfen bir kredi türü seçin.' }]}
              >
                <Select placeholder="Kredi türü seçin">
                  {loanTypes.map((type) => (
                    <Option key={type.id} value={type.id}>{type.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Kredi Adı"
            name="name"
            rules={[{ required: true, message: 'Lütfen bir kredi adı girin.' }]}
          >
            <Input placeholder="Örn: Ev Kredisi" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Çekilen Toplam Para (₺)"
                name="amount_drawn"
                rules={[{ required: true, message: 'Lütfen çekilen toplam tutarı girin.' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  formatter={val => `₺ ${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={val => val.replace(/₺\s?|(,*)/g, '')}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="Vade (Ay)"
                name="term_months"
                rules={[{ required: true, message: 'Lütfen vade (ay) bilgisini girin.' }]}
              >
                <InputNumber style={{ width: '100%' }} min={1} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="Aylık Faiz Oranı (%)"
                name="monthly_interest_rate"
                rules={[{ required: true, message: 'Lütfen aylık faiz oranını girin.' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  step={0.01}
                  precision={2}
                  formatter={val => `${val}%`}
                  parser={val => val.replace('%', '')}
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                label="BSMV Oranı (%)"
                name="bsmv_rate"
                rules={[{ required: true, message: 'Lütfen BSMV oranını girin.' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  step={1}
                  precision={0}
                  formatter={val => `${val}%`}
                  parser={val => val.replace('%', '')}
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                label="Her Ayın Ödeme Günü"
                name="payment_due_day"
                rules={[{ required: true, message: 'Lütfen her ayın ödeme gününü girin.' }]}
              >
                <InputNumber style={{ width: '100%' }} min={1} max={31} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Çekildiği Gün"
                name="date_drawn"
                rules={[{ required: true, message: 'Lütfen çekildiği günü seçin.' }]}
              >
                <DatePicker format="DD.MM.YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="Açıklama (Opsiyonel)" name="description">
                <Input.TextArea rows={1} placeholder="Ek notlar" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}

const queryClient = new QueryClient();

export default function ProvidedBankLoans({ loan }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BankLoans loan={loan} showAddButton={true} />
    </QueryClientProvider>
  );
}
