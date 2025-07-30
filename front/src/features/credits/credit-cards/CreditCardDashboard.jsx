// front/src/features/credits/credit-cards/CreditCardDashboard.jsx

import React, { useState, useEffect } from 'react';
import { getCreditCards, getTransactionsForCard, addTransactionToCard } from '../../../api/creditCardService';
import CreditCard from './components/CreditCard';
import CreditCardModal from './components/CreditCardModal';
import AddCreditCardModal from './components/AddCreditCardModal';
import EditCreditCardModal from './components/EditCreditCardModal';
import './styles/CreditCard.css';
import './styles/CreditCardDashboard.css';
import { Button } from 'antd'; // Ant Design Button import
import { PlusOutlined } from '@ant-design/icons'; // Ant Design PlusOutlined import

export default function CreditCardDashboard() {
  const [cards, setCards] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isTransactionModalVisible, setIsTransactionModalVisible] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);

  const fetchCards = async () => {
    try {
      const response = await getCreditCards();
      // DÜZELTME: getCreditCards() doğrudan bir dizi döndürüyor.
      // response.data yerine doğrudan response'u kullanın.
      const fetchedCards = Array.isArray(response) ? response : []; 
      setCards(fetchedCards);
      console.log("CreditCardDashboard: 'cards' state'ine set edilen kartlar:", fetchedCards); 
      // Eğer bu noktada fetchedCards boş değilse ancak kartlar yine de görünmüyorsa,
      // render döngüsünde veya CreditCard bileşeninde başka bir sorun olabilir.
    } catch (error) {
      console.error("CreditCardDashboard: Kartlar getirilirken hata oluştu:", error);
      setCards([]); // Hata durumunda kartları boşalt
    }
  };

  useEffect(() => {
    console.log("CreditCardDashboard: Bileşen yüklendi, kartlar getiriliyor.");
    fetchCards();
  }, []);

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
      await fetchCards();
      const transactionsResponse = await getTransactionsForCard(selectedCard.id);
      setTransactions(transactionsResponse.data);
      const updatedCards = await getCreditCards();
      const updatedSelectedCard = updatedCards.find(c => c.id === selectedCard.id); // 'response.data' yok
      setSelectedCard(updatedSelectedCard);
    } catch (error) {
      console.error("İşlem eklenirken hata oluştu:", error);
    }
  };

  const handleCardAdded = () => {
    fetchCards();
  };

  const handleCardUpdated = () => {
    fetchCards();
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Kredi Kartlarım</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsAddModalVisible(true)}>
          Yeni Kart Ekle
        </Button>
      </div>
      <div className="dashboard-grid">
        {cards.length === 0 && !selectedCard && !isAddModalVisible && !isEditModalVisible && (
          <p>Gösterilecek kredi kartı bulunamadı.</p>
        )}
        {cards.map((card) => (
          <CreditCard
            key={card.id}
            card={card}
            onClick={() => handleCardClick(card)}
            onEditClick={handleEditClick}
          />
        ))}
      </div>
      
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
        onCardAdded={handleCardAdded}
      />

      <EditCreditCardModal
        visible={isEditModalVisible}
        onClose={() => setIsEditModalVisible(false)}
        onCardUpdated={handleCardUpdated}
        card={selectedCard}
      />
    </div>
  );
}