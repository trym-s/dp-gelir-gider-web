import React, { useState, useEffect } from 'react';
import { getCreditCards, getTransactionsForCard, addTransactionToCard, getAllBilledTransactions } from '../../../api/creditCardService';
import CreditCard from './components/CreditCard';
import BillCard from './components/BillCard';
import CreditCardModal from './components/CreditCardModal';
import AddCreditCardModal from './components/AddCreditCardModal';
import EditCreditCardModal from './components/EditCreditCardModal';
import './styles/CreditCard.css';
import './styles/CreditCardDashboard.css'; // Stil dosyamız
import { Button } from 'antd'; // Sadece Button'a ihtiyacımız var
import { PlusOutlined, ArrowRightOutlined, ArrowLeftOutlined } from '@ant-design/icons'; // Gerekli ikonları import ediyoruz

export default function CreditCardDashboard({ refreshKey, onCardsUpdate }) {
  const [cards, setCards] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isTransactionModalVisible, setIsTransactionModalVisible] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [billedTransactions, setBilledTransactions] = useState({});
  
  // 'Tabs' yerine hangi görünümün aktif olacağını tutan state
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'bills'

  const fetchCards = async () => {
    try {
      const response = await getCreditCards();
      const fetchedCards = Array.isArray(response) ? response : [];
      // React'in değişikliği algılaması için her kart nesnesinin sığ bir kopyasını oluştur.
      // Bu, prop referansının değişmesini ve alt bileşenlerin yeniden render edilmesini garantiler.
      const newCards = fetchedCards.map(card => ({ ...card }));
      setCards(newCards);
    } catch (error) {
      console.error("CreditCardDashboard: Kartlar getirilirken hata oluştu:", error);
      setCards([]);
    }
  };

  const fetchBilledTransactions = async () => {
    try {
      const response = await getAllBilledTransactions();
      const responseData = response.data;
      const groupedTransactions = {};
      responseData.forEach(transaction => {
        if (!groupedTransactions[transaction.credit_card_id]) {
          groupedTransactions[transaction.credit_card_id] = {};
        }
        if (!groupedTransactions[transaction.credit_card_id][transaction.bill_id]) {
          groupedTransactions[transaction.credit_card_id][transaction.bill_id] = [];
        }
        groupedTransactions[transaction.credit_card_id][transaction.bill_id].push(transaction);
      });
      setBilledTransactions(groupedTransactions);
    } catch (error) {
      console.error("Error fetching billed transactions:", error);
      setBilledTransactions({});
    }
  };

  const hardRefresh = async () => {
    await Promise.all([fetchCards(), fetchBilledTransactions()]);
  };

  useEffect(() => {
    fetchCards();
    fetchBilledTransactions();
  }, [refreshKey]);

  const handleCardClick = async (card) => {
    setSelectedCard(card);
    setIsTransactionModalVisible(true);
    try {
      const response = await getTransactionsForCard(card.id);
      setTransactions(response.data);
    } catch (error) {
      console.error("İşlemler getirilirken hata oluştu:", error);
      setTransactions([]);
    }
  };

  const handleEditClick = (card) => {
    setIsTransactionModalVisible(false);
    setSelectedCard(card);
    setIsEditModalVisible(true);
  };

  const handleTransactionModalClose = () => {
    setIsTransactionModalVisible(false);
    setSelectedCard(null);
    setTransactions([]);
  };

  const handleTransactionSubmit = async (transactionDetails) => {
    if (!selectedCard) return;

    try {
      await addTransactionToCard(selectedCard.id, transactionDetails);
      // Veri tutarlılığı için ilgili verileri yeniden çekiyoruz
      await Promise.all([
        fetchCards(),
        fetchBilledTransactions(),
        getTransactionsForCard(selectedCard.id).then(res => setTransactions(res.data))
      ]);
      const updatedCards = await getCreditCards();
      const updatedSelectedCard = updatedCards.find(c => c.id === selectedCard.id);
      setSelectedCard(updatedSelectedCard);
    } catch (error) {
      console.error("İşlem eklenirken hata oluştu:", error);
    }
  };
  
  

  return (
    <div className="page-container">
      {/* --- YENİ MODERN HEADER --- */}
      <div className="page-header">
        <h1 className="page-title">
          {viewMode === 'cards' ? 'Kredi Kartlarım' : 'Faturalarım'}
        </h1>
        <div className="header-actions">
          {viewMode === 'cards' ? (
            <>
              {/* Fatura ekranına geçiş butonu */}
              <Button
                className="view-switch-button"
                type="text"
                onClick={() => setViewMode('bills')}
              >
                Faturaları Gör <ArrowRightOutlined />
              </Button>
              {/* Yeni kart ekle butonu */}
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={() => setIsAddModalVisible(true)}
              >
                Yeni Kart Ekle
              </Button>
            </>
          ) : (
            /* Kartlar ekranına geri dönüş butonu */
            <Button
              className="view-switch-button"
              type="text"
              onClick={() => setViewMode('cards')}
            >
              <ArrowLeftOutlined /> Kartlarıma Dön
            </Button>
          )}
        </div>
      </div>
      
      {/* --- İÇERİK ALANI (STATE'E GÖRE DEĞİŞEN) --- */}
      <div className="dashboard-grid">
        {viewMode === 'cards' ? (
          <>
            {cards.length > 0 ? (
              cards.map((card) => (
                <CreditCard
                  key={card.id}
                  card={card}
                  onClick={() => handleCardClick(card)}
                  onEditClick={handleEditClick}
                  onCardsUpdate={onCardsUpdate}
                  onCardsRefresh={hardRefresh}
                />
              ))
            ) : (
              <p>Gösterilecek kredi kartı bulunamadı.</p>
            )}
          </>
        ) : (
          <>
            {cards.length > 0 ? (
              cards.map((card) => (
                <BillCard
                  key={card.id}
                  card={card}
                  billedTransactions={billedTransactions[card.id] || {}}
                />
              ))
            ) : (
              <p>Fatura bilgisi için önce bir kredi kartı eklemelisiniz.</p>
            )}
          </>
        )}
      </div>

      {/* --- MODALLAR (Değişiklik yok) --- */}
      <CreditCardModal
        card={selectedCard}
        transactions={transactions}
        visible={isTransactionModalVisible}
        onClose={handleTransactionModalClose}
        onTransactionSubmit={handleTransactionSubmit}
        onEditClick={handleEditClick}
      />

      <AddCreditCardModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        onCardAdded={onCardsUpdate}
      />

      <EditCreditCardModal
        visible={isEditModalVisible}
        onClose={() => setIsEditModalVisible(false)} // Düzeltme: isAddModalVisible değil, isEditModalVisible kontrol edilmeli.
        onCardUpdated={onCardsUpdate}
        card={selectedCard}
      />
    </div>
  );
}
