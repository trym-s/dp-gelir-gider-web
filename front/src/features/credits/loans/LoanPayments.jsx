import React, { useState, useEffect } from 'react';
import { List, Spin, Typography, Tag, message } from 'antd';
import dayjs from 'dayjs';
import { getPaymentsForLoan } from '../../../api/loanService';

const { Text } = Typography;

const paymentTypeDisplay = {
  REGULAR_INSTALLMENT: "Normal Taksit",
  PREPAYMENT: "Ara Ödeme",
  SETTLEMENT: "Erken Kapama Ödemesi",
  OTHER: "Diğer"
};

const LoanPayments = ({ loanId }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!loanId) return;
    const fetchPayments = async () => {
      try {
        setLoading(true);
        const response = await getPaymentsForLoan(loanId);
        setPayments(response.data.data);
      } catch (error) {
        message.error('Ödemeler getirilirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, [loanId]);

  if (loading) return <div style={{textAlign: 'center', padding: '20px'}}><Spin size="small" /></div>;
  if (payments.length === 0) return <Text type="secondary">Bu kredi için henüz ödeme yapılmamış.</Text>;

  return (
    <List
      size="small"
      dataSource={payments}
      renderItem={item => (
        <List.Item>
          <List.Item.Meta
            title={`Tutar: ₺${parseFloat(item.amount_paid).toLocaleString('tr-TR')} - Tarih: ${dayjs(item.payment_date).format('DD.MM.YYYY')}`}
            description={item.notes}
          />
          <Tag color={item.status === 'COMPLETED' ? 'green' : 'orange'}>
            {paymentTypeDisplay[item.payment_type] || item.payment_type}
          </Tag>
        </List.Item>
      )}
    />
  );
};

export default LoanPayments;