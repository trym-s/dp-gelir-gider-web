import React, { useState, useEffect } from 'react';
import { getBanksWithAccounts } from '../../api/bankService';
import { Spin, Alert, Row, Col, Typography } from 'antd';
import BankCard from './BankCard';

const { Title } = Typography;

const BanksDashboardPage = () => {
  const [banksData, setBanksData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        setLoading(true);
        const response = await getBanksWithAccounts();
        setBanksData(response.data);
      } catch (err) {
        setError('Banka verileri yüklenirken bir hata oluştu.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchBanks();
  }, []);

  if (loading) return <Spin tip="Bankalar Yükleniyor..." size="large" style={{ display: 'block', marginTop: '50px' }} />;
  if (error) return <Alert message="Hata" description={error} type="error" showIcon />;

  return (
    <div>
      <Title level={2} style={{ marginBottom: '24px' }}>Banka Paneli</Title>
      <Row gutter={[24, 24]}>
        {banksData.map(bank => (
          <Col key={bank.id} xs={24} sm={24} md={12} lg={8} xl={8}>
            <BankCard bank={bank} />
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default BanksDashboardPage;
