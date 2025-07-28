import React, { useState, useEffect } from 'react';
import { getBanksWithAccounts } from '../../api/bankService';
import { Spin, Alert, Row, Col, Typography } from 'antd';
import BankCard from './BankCard';
import BankDetailModal from './BankDetailModal';
import AccountDetailModal from './AccountDetailModal';

const { Title } = Typography;

// Banka isimlerini public klasöründeki logo yollarına eşleştiren obje
// Dosya adlarının ve uzantılarının public klasörünüzdeki ile aynı olduğundan emin olun.
const bankLogoMap = {
  'Akbank': '/bank_logo/Akbank-icon.png',
  'TEB': '/bank_logo/Teb-icon.png',
  'Yapi Kredi': '/bank_logo/Yapi-Kredi-Logo.png',
  'TFKB': '/bank_logo/tfkb-logo.png',  'Garanti BBVA': '/bank_logo/garanti-logo.png',
  'Is Bankasi': '/bank_logo/is-bankasi-logo.png',
  'Ziraat Bankasi': '/bank_logo/ziraat-logo.png',
  'QNB': '/bank_logo/qnb-logo.png',
  'Vakifbank': '/bank_logo/vakifbank-logo.png',
  'default': '/default-bank-logo.png' 
};

const BanksDashboardPage = () => {
  const [banksData, setBanksData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);

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

  const handleBankClick = (bank) => {
    setSelectedBank(bank);
    setIsBankModalOpen(true);
  };

  const handleAccountClick = (account, bank) => {
    setSelectedAccount({ ...account, bankName: bank.name });
    setIsAccountModalOpen(true);
  };

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
          // Her banka için logo yolunu haritadan al
          const localLogoUrl = bankLogoMap[bank.name] || bankLogoMap['default'];
          const bankWithLocalLogo = { ...bank, logo_url: localLogoUrl };

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