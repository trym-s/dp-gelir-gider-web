import React, { useState, useEffect } from 'react';
import { getBanksWithAccounts, getCreditCardsWithBanks, getLoanSummaryByBank, getCreditCardSummaryByBank } from '../../api/bankService'; // getCreditCardsWithBanks eklendi
import { addTransactionToCard, getTransactionsForCard } from '../../api/creditCardService';
import { Spin, Alert, Typography } from 'antd';
import BankCard from './BankCard';
import BankDetailModal from './BankDetailModal';
import AccountDetailModal from './AccountDetailModal';
import CreditCardModal from '../credits/credit-cards/components/CreditCardModal';

const { Title } = Typography;

import { bankLogoMap } from '../../icons/bankLogoMap';

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
  useEffect(() => {
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

  const handleTransactionSubmit = async (transactionDetails) => {
    if (!selectedCreditCard) return;

    try {
      await addTransactionToCard(selectedCreditCard.id, transactionDetails);
      await fetchData(); // Refetch all data

      // Update selectedCreditCard to get new transactions
      const creditCardsResponse = await getCreditCardsWithBanks();
      const allCards = Object.values(creditCardsResponse.data).flat();
      const updatedSelectedCard = allCards.find(c => c.id === selectedCreditCard.id);
      setSelectedCreditCard(updatedSelectedCard);

    } catch (error) {
      console.error("İşlem eklenirken hata oluştu:", error);
    }
  };

  const handleEditClick = (card) => {
      console.log("Edit clicked for card:", card);
      // For now, just close the modal.
      // Implementation of edit modal can be done later.
      closeModal();
  };

  const closeModal = () => {
    setIsBankModalOpen(false);
    setIsAccountModalOpen(false);
    setIsCreditCardModalOpen(false);
    setSelectedBank(null);
    setSelectedAccount(null);
    setSelectedCreditCard(null);
  };

  const columns = [[], [], []];
  banksData.forEach((bank, index) => {
    columns[index % 3].push(bank);
  });


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

      {isBankModalOpen && selectedBank && <BankDetailModal bank={selectedBank} onClose={closeModal} allCreditCardsGrouped={creditCardsData} />}
      {isAccountModalOpen && selectedAccount && <AccountDetailModal account={selectedAccount} onClose={closeModal} />}
      {isCreditCardModalOpen && selectedCreditCard && <CreditCardModal card={selectedCreditCard} transactions={selectedCreditCard.transactions || []} visible={isCreditCardModalOpen} onClose={closeModal} onTransactionSubmit={handleTransactionSubmit} onEditClick={handleEditClick} />}
    </div>
  );
};

export default BanksDashboardPage;
