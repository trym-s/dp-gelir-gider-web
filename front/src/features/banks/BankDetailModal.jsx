import React, { useState, useEffect } from 'react';
import { Modal, Typography, Row, Col, Statistic, List, Avatar, Spin, Alert } from 'antd';
import styled from 'styled-components';
import { getBankSummary } from '../../api/bankService';

const { Title, Text } = Typography;

const StyledModal = styled(Modal)`
  .ant-modal-content {
    border-radius: 12px;
  }
  .ant-modal-header {
    border-radius: 12px 12px 0 0;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 24px;
`;

const Logo = styled.img`
  width: 48px;
  height: 48px;
  margin-right: 16px;
  object-fit: contain;
`;

const BankDetailModal = ({ bank, onClose }) => {
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (bank) {
      const fetchSummary = async () => {
        try {
          setLoading(true);
          const response = await getBankSummary(bank.id);
          setSummaryData(response.data);
        } catch (err) {
          setError('Özet verileri yüklenirken bir hata oluştu.');
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchSummary();
    }
  }, [bank]);

  if (!bank) return null;

  return (
    <StyledModal
      title=""
      visible={true}
      onCancel={onClose}
      footer={null}
      width={700}
    >
      <Header>
        <Logo src={bank.logo_url} alt={`${bank.name} logo`} />
        <Title level={3} style={{ margin: 0 }}>{bank.name} Varlık Özeti</Title>
      </Header>

      {loading ? (
        <Spin />
      ) : error ? (
        <Alert message="Hata" description={error} type="error" showIcon />
      ) : summaryData ? (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col span={8}>
              <Statistic title="Toplam Varlık (TRY)" value={summaryData.total_assets_in_try.toFixed(2)} />
            </Col>
            <Col span={8}>
              <Statistic title="Kredi Kartı Borcu" value={summaryData.total_credit_card_debt.toFixed(2)} />
            </Col>
            <Col span={8}>
              <Statistic title="Kredi Borcu" value={summaryData.total_loan_debt.toFixed(2)} />
            </Col>
          </Row>

          <Title level={4}>Hesaplar</Title>
          <List
            itemLayout="horizontal"
            dataSource={bank.accounts}
            renderItem={item => (
              <List.Item>
                <List.Item.Meta
                  avatar={<Avatar>{item.currency.slice(0,1)}</Avatar>}
                  title={<Text strong>{item.name}</Text>}
                  description={`IBAN: ${item.iban || 'N/A'}${typeof item.balance === 'number' ? ` - Bakiye: ${item.balance.toFixed(2)} ${item.currency}` : ''}`}
                />
              </List.Item>
            )}
          />
        </>
      ) : null}
    </StyledModal>
  );
};

export default BankDetailModal;
