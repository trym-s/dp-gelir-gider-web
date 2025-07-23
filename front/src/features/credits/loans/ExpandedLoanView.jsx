import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAmortizationSchedule, makePayment } from '../../../api/loanService';
import { Row, Col, Card, Table, Spin, Alert, Typography, Tag, Modal, Form, InputNumber, DatePicker, Select, Input, message } from 'antd';
import LoanPayments from './LoanPayments';
import styles from './LoanDetail.module.css';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const currencyFormatter = (value) => 
  `₺${parseFloat(value).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ExpandedLoanView = ({ loanId, isActive }) => {
  const queryClient = useQueryClient();
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState(null);
  const [form] = Form.useForm();

  const { data: schedule, isLoading, isError, error, dataUpdatedAt } = useQuery({
    queryKey: ['amortizationSchedule', loanId],
    queryFn: () => getAmortizationSchedule(loanId),
    enabled: !!loanId && isActive,
    select: (response) => response.data.data,
  });

  

  const { mutate: savePayment, isLoading: isSavingPayment } = useMutation({
    mutationFn: (paymentData) => makePayment(loanId, paymentData),
    onSuccess: () => {
      message.success('Ödeme başarıyla kaydedildi.');
      queryClient.invalidateQueries({ queryKey: ['amortizationSchedule', loanId] });
      queryClient.invalidateQueries({ queryKey: ['loanPayments', loanId] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      setPaymentModalVisible(false);
    },
    onError: (error) => {
        const errorMessage = error.response?.data?.error || 'Ödeme kaydedilirken bir hata oluştu.';
        message.error(errorMessage);
    },
  });

  const handleOpenPaymentModal = (installment) => {
    setSelectedInstallment(installment);
    form.setFieldsValue({
      amount_paid: parseFloat(installment.monthly_payment).toFixed(2),
      payment_date: dayjs(),
      payment_type: 'REGULAR_INSTALLMENT',
      notes: `Taksit #${installment.installment_number} ödemesi`,
    });
    setPaymentModalVisible(true);
  };

  const handleSavePayment = async () => {
    try {
      const values = await form.validateFields();
      const paymentData = {
        ...values,
        payment_date: values.payment_date.format('YYYY-MM-DD'),
        installment_id: selectedInstallment?.id,
      };
      savePayment(paymentData);
    } catch (err) {
      message.error('Lütfen formu kontrol edin.');
    }
  };

  const scheduleColumns = [
    { title: '#', dataIndex: 'installment_number', key: 'installment_number', align: 'center', width: '5%' },
    { title: 'Vade Tarihi', dataIndex: 'due_date', key: 'due_date', render: (text) => dayjs(text).format('DD.MM.YYYY'), align: 'center', width: '20%' },
    { title: 'Aylık Taksit', dataIndex: 'monthly_payment', key: 'monthly_payment', render: currencyFormatter, align: 'right', className: styles.numericCell },
    { title: 'Anapara', dataIndex: 'principal_share', key: 'principal_share', render: currencyFormatter, align: 'right', className: styles.numericCell },
    { title: 'Faiz', dataIndex: 'interest_share', key: 'interest_share', render: currencyFormatter, align: 'right', className: styles.numericCell },
    { title: 'Kalan Anapara', dataIndex: 'remaining_principal', key: 'remaining_principal', render: currencyFormatter, align: 'right', className: styles.numericCell },
    {
      title: 'Durum',
      dataIndex: 'status',
      key: 'status',
      align: 'center',
      render: (status) => (
        <Tag color={status === 'Paid' ? 'success' : 'warning'}>
          {status === 'Paid' ? 'Ödendi' : 'Ödenecek'}
        </Tag>
      ),
    },
  ];

  if (isLoading) {
    return <div style={{ padding: '50px', textAlign: 'center' }}><Spin size="large" /></div>;
  }

  if (isError) {
    return <Alert message="Veri Yüklenemedi" description={error?.message} type="error" showIcon />;
  }

  return (
    <>
      <div style={{ padding: '16px', backgroundColor: '#fafafa' }}>
        <Row gutter={24}>
          <Col xs={24} lg={8}>
            <Card title={<Title level={5}>Ödeme Geçmişi</Title>}>
              <LoanPayments loanId={loanId} />
            </Card>
          </Col>
          <Col xs={24} lg={16}>
            <Card title={<Title level={5}>Amortisman Tablosu</Title>}>
              <Table
                columns={scheduleColumns}
                dataSource={(schedule || []).map(item => ({ ...item, key: item.id }))}
                pagination={false}
                scroll={{ y: 400 }}
                size="small"
                rowClassName={(record, index) => `${styles.tableRow} ${record.status !== 'Paid' ? styles.clickableRow : ''}`}
                onRow={(record) => ({
                  onClick: () => {
                    if (record.status !== 'Paid') {
                      handleOpenPaymentModal(record);
                    }
                  },
                })}
              />
            </Card>
          </Col>
        </Row>
      </div>
      <Modal 
        title={`Taksit #${selectedInstallment?.installment_number} Ödemesi`}
        open={paymentModalVisible} 
        onOk={handleSavePayment} 
        onCancel={() => setPaymentModalVisible(false)} 
        okText="Ödemeyi Kaydet" 
        cancelText="İptal" 
        confirmLoading={isSavingPayment}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Alert 
            message={`Ödenecek Tutar: ${currencyFormatter(selectedInstallment?.monthly_payment || 0)}`} 
            type="info" 
            showIcon 
            style={{ marginBottom: 24 }} 
          />
          <Form.Item label="Ödeme Tutarı" name="amount_paid" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} formatter={val => `₺ ${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={val => val.replace(/₺\s?|(,*)/g, '')} />
          </Form.Item>
          <Form.Item label="Ödeme Tarihi" name="payment_date" rules={[{ required: true }]}>
            <DatePicker format="DD.MM.YYYY" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="payment_type" label="Ödeme Türü" rules={[{ required: true }]}>
            <Select>
              <Option value="REGULAR_INSTALLMENT">Normal Taksit</Option>
              <Option value="PREPAYMENT" disabled>Ara Ödeme (Devre Dışı)</Option>
              <Option value="SETTLEMENT" disabled>Erken Kapama (Devre Dışı)</Option>
              <Option value="OTHER" disabled>Diğer (Devre Dışı)</Option>
            </Select>
          </Form.Item>
          <Form.Item label="Notlar" name="notes">
            <TextArea rows={3} placeholder="Ödeme ile ilgili notlar" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default ExpandedLoanView;
