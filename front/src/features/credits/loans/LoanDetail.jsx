import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLoanById, getAmortizationSchedule } from '../../../api/loanService';
import { Table, Spin, Alert, Descriptions, Typography, Button, Tooltip, Row, Col, Collapse, Space, Popconfirm } from 'antd';
import { TableOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import LoanPayments from './LoanPayments';
import styles from './LoanDetail.module.css';

const { Title, Text } = Typography;

const currencyFormatter = (value) => 
  `₺${parseFloat(value).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const LoanDetail = ({ loanId, isTableVisible, onToggleTable, onEdit, onDelete }) => {
  const { data: loan, isLoading: isLoadingLoan, isError: isErrorLoan, error: errorLoan } = useQuery({
    queryKey: ['loan', loanId],
    queryFn: () => getLoanById(loanId),
    enabled: !!loanId,
  });

  const { data: schedule, isLoading: isLoadingSchedule, isError: isErrorSchedule, error: errorSchedule } = useQuery({
    queryKey: ['amortizationSchedule', loanId],
    queryFn: () => getAmortizationSchedule(loanId),
    enabled: !!loanId && isTableVisible, // Only fetch schedule if table is visible
  });

  if (isLoadingLoan) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}><Spin size="large" /></div>;
  }

  if (isErrorLoan) {
    return <div style={{ padding: '24px' }}><Alert message="Veri Yüklenemedi" description={errorLoan?.message} type="error" showIcon /></div>;
  }

  const scheduleColumns = [
    { title: '#', dataIndex: 'installment_number', key: 'installment_number', align: 'center', className: styles.numericCell, width:'24px' },
    { title: 'Taksit', dataIndex: 'monthly_payment', key: 'monthly_payment', render: currencyFormatter, align: 'center', className: styles.numericCell, width:'70px' },
    { title: 'Anapara', dataIndex: 'principal_share', key: 'principal_share', render: currencyFormatter, align: 'center', className: styles.numericCell, width:'70px' },
    { title: 'Faiz', dataIndex: 'interest_share', key: 'interest_share', render: currencyFormatter, align: 'center', className: styles.numericCell, width:'70px' },
    { title: 'Kalan', dataIndex: 'remaining_principal', key: 'remaining_principal', render: currencyFormatter, align: 'center', className: styles.numericCell, width:'70px' },
  ];

  return (
    <div style={{ padding: '12px', background: '#f9fafb' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={4} style={{ margin: 0 }}>{loan?.data.name} Detayları</Title>
        <Space>
          <Tooltip title="Düzenle">
            <Button icon={<EditOutlined />} onClick={() => onEdit(loan?.data)} />
          </Tooltip>
          <Popconfirm
            title="Bu krediyi silmek istediğinizden emin misiniz?"
            onConfirm={() => onDelete(loanId)}
            okText="Evet"
            cancelText="Hayır"
          >
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
          <Tooltip title={isTableVisible ? "Tabloyu Gizle" : "Amortisman Tablosunu Göster"}>
            <Button 
              icon={<TableOutlined />} 
              onClick={onToggleTable} 
              type={isTableVisible ? 'primary' : 'default'} 
            />
          </Tooltip>
        </Space>
      </div>

      <Row gutter={24}>
        <Col span={isTableVisible ? 8 : 24} style={{ transition: 'all 0.3s' }}>
          <Descriptions column={1} size="small">
              <Descriptions.Item label="Banka">{loan?.data.bank_account.bank.name}</Descriptions.Item>
              <Descriptions.Item label="Hesap Adı">{loan?.data.bank_account.name}</Descriptions.Item>
              <Descriptions.Item label="Çekilen Tutar"><Text strong style={{color: '#1677ff'}}>{currencyFormatter(loan?.data.amount_drawn)}</Text></Descriptions.Item>
              <Descriptions.Item label="Aylık Taksit"><Text strong>{currencyFormatter(loan?.data.monthly_payment_amount)}</Text></Descriptions.Item>
              <Descriptions.Item label="Vade">{loan?.data.term_months} Ay</Descriptions.Item>
              <Descriptions.Item label="Çekim Tarihi">{new Date(loan?.data.date_drawn).toLocaleDateString('tr-TR')}</Descriptions.Item>
              <Descriptions.Item label="Aylık Faiz">%{(loan?.data.monthly_interest_rate * 100).toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label="BSMV Oranı">%{(loan?.data.bsmv_rate * 100).toFixed(2)}</Descriptions.Item>
          </Descriptions>
        </Col>
        
        {isTableVisible && (
          <Col span={16} style={{ transition: 'all 0.8s' }}>
            {isLoadingSchedule ? <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Spin /></div> :
             isErrorSchedule ? <Alert message="Tablo Yüklenemedi" type="error" /> :
             <Table
             padding= "4px"
                tableLayout="auto"
                columns={scheduleColumns.map(col => ({ ...col, onHeaderCell: () => ({ style: { fontSize: '14px', padding: '2px' } }) }))}
                dataSource={schedule?.data.map(item => ({ ...item, key: item.installment_number }))}
                pagination={false}
                size="small"
                bordered
                onRow={() => ({ style: { fontSize: '12px', padding: 0 } })}
              />
            }
          </Col>
        )}
      </Row>
      
      <div style={{ marginTop: '24px' }}>
        <Title level={5}>Geçmiş Ödemeler</Title>
        <LoanPayments loanId={loanId} />
      </div>
    </div>
  );
};

export default LoanDetail;
