import React, { useState, useEffect } from 'react';
import { Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { getCreditCards, getTransactionsForCard, addTransactionToCard } from '../../../api/creditCardService';
import CreditCard from './components/CreditCard';
import CreditCardModal from './components/CreditCardModal';
import AddCreditCardModal from './components/AddCreditCardModal';
import EditCreditCardModal from './components/EditCreditCardModal';
import './styles/CreditCard.css';
import './styles/CreditCardDashboard.css';

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
      setCards(response.data);
    } catch (error) {
      console.error("Kredi kartları getirilirken hata oluştu:", error);
    }
  };

  useEffect(() => {
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
    // Önce işlem modal'ını kapat, sonra düzenleme modal'ını aç
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
      const updatedSelectedCard = updatedCards.data.find(c => c.id === selectedCard.id);
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
