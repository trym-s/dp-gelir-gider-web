import React, { useState, useEffect } from 'react';
import { getBanksWithAccounts, getCreditCardsWithBanks, getLoanSummaryByBank, getCreditCardSummaryByBank } from '../../api/bankService'; // getCreditCardsWithBanks eklendi
import { Spin, Alert, Typography } from 'antd';
import BankCard from './BankCard';
import BankDetailModal from './BankDetailModal';
import AccountDetailModal from './AccountDetailModal';
import CreditCardModal from '../credits/credit-cards/components/CreditCardModal';

const { Title } = Typography;

const bankLogoMap = {
  'Akbank': '/bank_logo/Akbank-icon.png',
  'TEB': '/bank_logo/Teb-icon.png',
  'Yapi Kredi': '/bank_logo/Yapi-Kredi-Logo.png',
  'TFKB': '/bank_logo/tfkb-logo.png',  
  'Garanti BBVA': '/bank_logo/garanti-logo.png',
  'Is Bankasi': '/bank_logo/is-bankasi-logo.png',
  'Ziraat Bankasi': '/bank_logo/ziraat-logo.png',
  'QNB': '/bank_logo/qnb-logo.png',
  'Vakifbank': '/bank_logo/vakifbank-logo.png',
  'default': '/default-bank-logo.png',
  'wio Bank': '/wio-logo.png',
};

const BanksDashboardPage = () => {
  const [banksData, setBanksData] = useState([]);
  const [creditCardsData, setCreditCardsData] = useState([]);
  const [loanSummaryData, setLoanSummaryData] = useState({});
  const [creditCardSummaryData, setCreditCardSummaryData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isCreditCardModalOpen, setIsCreditCardModalOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedCreditCard, setSelectedCreditCard] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // getCreditCards() yerine getCreditCardsWithBanks() kullanıldı
        const [banksResponse, creditCardsResponse, loanSummaryResponse, creditCardSummaryResponse] = await Promise.all([
          getBanksWithAccounts(),
          getCreditCardsWithBanks(),
          getLoanSummaryByBank(),
          getCreditCardSummaryByBank()
        ]);
        setBanksData(banksResponse.data);
        setCreditCardsData(creditCardsResponse.data);
        setLoanSummaryData(loanSummaryResponse.data);
        setCreditCardSummaryData(creditCardSummaryResponse.data);
      } catch (err) {
        setError('Veriler yüklenirken bir hata oluştu.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleBankClick = (bank) => {
    setSelectedBank(bank);
    setIsBankModalOpen(true);
  };

  const handleAccountClick = (account, bank) => {
    setSelectedAccount({ ...account, bankName: bank.name });
    setIsAccountModalOpen(true);
  };

  const handleCreditCardClick = (creditCard) => {
    setSelectedCreditCard(creditCard);
    setIsCreditCardModalOpen(true);
  };

  const closeModal = () => {
    setIsBankModalOpen(false);
    setIsAccountModalOpen(false);
    setIsCreditCardModalOpen(false);
    setSelectedBank(null);
    setSelectedAccount(null);
    setSelectedCreditCard(null);
  };

  // Banka verisini 3 dikey sütuna ayırıyoruz.
  const columns = [[], [], []];
  banksData.forEach((bank, index) => {
    columns[index % 3].push(bank);
  });
  // --- YENİ BÖLÜM SONU ---


  if (loading) return <Spin tip="Bankalar Yükleniyor..." size="large" style={{ display: 'block', marginTop: '50px' }} />;
  if (error) return <Alert message="Hata" description={error} type="error" showIcon />;

  return (
    <div>
      <Title level={2} style={{ marginBottom: '24px' }}>Banka Paneli</Title>
      
      {/* Ant Design'ın Row ve Col'u yerine daha esnek bir flex yapısı kullanıyoruz */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        
        {/* Her bir sütunu ayrı ayrı render ediyoruz */}
        {columns.map((column, colIndex) => (
          <div key={colIndex} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            
            {/* O sütuna ait banka kartlarını render ediyoruz */}
            {column.map(bank => {
              const localLogoUrl = bankLogoMap[bank.name] || bankLogoMap['default'];
              const bankWithLocalLogo = { ...bank, logo_url: localLogoUrl };
              // creditCardsData'yı bank.id'ye göre filtreliyoruz
              const bankCreditCards = creditCardsData[bank.name] || [];

              const bankLoanSummary = loanSummaryData[bank.name] || { total_loan_amount: 0, total_paid_amount: 0 };
              const bankCreditCardSummary = creditCardSummaryData[bank.name] || { total_credit_limit: 0, total_current_debt: 0 };

              return (
                <BankCard 
                  key={bank.id}
                  bank={bankWithLocalLogo} 
                  creditCards={bankCreditCards}
                  loanSummary={bankLoanSummary}
                  creditCardSummary={bankCreditCardSummary}
                  onBankClick={handleBankClick}
                  onAccountClick={handleAccountClick}
                  onCreditCardClick={handleCreditCardClick}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* MODAL'LER (Değişiklik yok) */}
      {isBankModalOpen && selectedBank && <BankDetailModal bank={selectedBank} onClose={closeModal} allCreditCardsGrouped={creditCardsData} />}
      {isAccountModalOpen && selectedAccount && <AccountDetailModal account={selectedAccount} onClose={closeModal} />}
      {isCreditCardModalOpen && selectedCreditCard && <CreditCardModal card={selectedCreditCard} transactions={selectedCreditCard.transactions || []} visible={isCreditCardModalOpen} onClose={closeModal} onTransactionSubmit={() => {}} onEditClick={() => {}} />}
    </div>
  );
};

export default BanksDashboardPage;