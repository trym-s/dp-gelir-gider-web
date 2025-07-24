import React, { useState, useEffect } from 'react';
import { getBanksWithAccounts } from '../../api/bankService';
import { Spin, Alert, Row, Col, Typography } from 'antd';
import BankCard from './BankCard';
import BankDetailModal from './BankDetailModal';
import AccountDetailModal from './AccountDetailModal';

const { Title } = Typography;

const BanksDashboardPage = () => {
  const [banksData, setBanksData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // YENİ STATE'LER
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState(null); // Tıklanan bankanın verisini tutar
  const [selectedAccount, setSelectedAccount] = useState(null); // Tıklanan hesabın verisini tutar

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

  // Modal'ı açan fonksiyonlar
  const handleBankClick = (bank) => {
    setSelectedBank(bank);
    setIsBankModalOpen(true);
  };

  const handleAccountClick = (account, bank) => {
    setSelectedAccount({ ...account, bankName: bank.name }); // Hesaba banka adını da ekleyelim
    setIsAccountModalOpen(true);
  };

  // Modal'ı kapatan fonksiyonlar
  const closeModal = () => {
    setIsBankModalOpen(false);
    setIsAccountModalOpen(false);
    setSelectedBank(null);
    setSelectedAccount(null);
  };

  if (loading) return <Spin tip="Bankalar Yükleniyor..." size="large" style={{ display: 'block', marginTop: '50px' }} />;
  if (error) return <Alert message="Hata" description={error} type="error" showIcon />;

  return (
    <div>
      <Title level={2} style={{ marginBottom: '24px' }}>Banka Paneli</Title>
      <Row gutter={[24, 24]}>
        {banksData.map(bank => {
          const bankWithLocalLogo = { ...bank };
          if (bank.name === 'Akbank') {
            bankWithLocalLogo.logo_url = '/Akbank-icon.png';
          } else if (bank.name === 'TEB') {
            bankWithLocalLogo.logo_url = '/Teb-icon.png';
          } else if (bank.name === 'Yapi Kredi') {
            bankWithLocalLogo.logo_url = '/Yapi-Kredi-Logo.png';
          } else if (bank.name === 'TFKB') {
            bankWithLocalLogo.logo_url = '/tfkb-logo.png';
          }
          return (
            <Col key={bank.id} xs={24} sm={24} md={12} lg={8} xl={8}>
              <BankCard 
                bank={bankWithLocalLogo} 
                onBankClick={handleBankClick}
                onAccountClick={handleAccountClick}
              />
            </Col>
          );
        })}
      </Row>

      {/* MODAL'LER */}
      {isBankModalOpen && selectedBank && <BankDetailModal bank={selectedBank} onClose={closeModal} />}
      {isAccountModalOpen && selectedAccount && <AccountDetailModal account={selectedAccount} onClose={closeModal} />}
    </div>
  );
};

export default BanksDashboardPage;
