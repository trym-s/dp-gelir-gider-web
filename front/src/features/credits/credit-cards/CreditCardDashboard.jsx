import React, { useState, useEffect } from 'react';
import { getCreditCards, getTransactionsForCard, addTransactionToCard, getAllBilledTransactions } from '../../../api/creditCardService';
import CreditCard from './components/CreditCard';
import BillCard from './components/BillCard'; // Import the new BillCard component
import CreditCardModal from './components/CreditCardModal';
import AddCreditCardModal from './components/AddCreditCardModal';
import EditCreditCardModal from './components/EditCreditCardModal';
import './styles/CreditCard.css';
import './styles/CreditCardDashboard.css';
import { Button, Tabs } from 'antd'; // Ant Design Button and Tabs import
import { PlusOutlined } from '@ant-design/icons'; // Ant Design PlusOutlined import

const { TabPane } = Tabs;

export default function CreditCardDashboard() {
  const [cards, setCards] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isTransactionModalVisible, setIsTransactionModalVisible] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [activeTabKey, setActiveTabKey] = useState('1'); // State for active tab
  const [billedTransactions, setBilledTransactions] = useState({}); // New state for billed transactions

  const fetchCards = async () => {
    try {
      const response = await getCreditCards();
      const fetchedCards = Array.isArray(response) ? response : []; 
      setCards(fetchedCards);
      console.log("CreditCardDashboard: 'cards' state'ine set edilen kartlar:", fetchedCards); 
    } catch (error) {
      console.error("CreditCardDashboard: Kartlar getirilirken hata oluştu:", error);
      setCards([]); 
    }
  };

  const fetchBilledTransactions = async () => {
    try {
      const response = await getAllBilledTransactions();
      const responseData = response.data; // Access the data array
      console.log("CreditCardDashboard: Raw billed transactions response:", responseData);
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
      console.log("CreditCardDashboard: Grouped billed transactions before setting state:", groupedTransactions);
      setBilledTransactions(groupedTransactions);
      console.log("CreditCardDashboard: Billed transactions grouped:", groupedTransactions);
    } catch (error) {
      console.error("Error fetching billed transactions:", error);
      setBilledTransactions({});
    }
  };

  useEffect(() => {
    console.log("CreditCardDashboard: Bileşen yüklendi, kartlar getiriliyor.");
    fetchCards();
    fetchBilledTransactions(); // Fetch billed transactions on component mount
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
      await fetchBilledTransactions(); // Re-fetch billed transactions after a new transaction is added
      const transactionsResponse = await getTransactionsForCard(selectedCard.id);
      setTransactions(transactionsResponse.data);
      const updatedCards = await getCreditCards();
      const updatedSelectedCard = updatedCards.find(c => c.id === selectedCard.id); 
      setSelectedCard(updatedSelectedCard);
    } catch (error) {
      console.error("İşlem eklenirken hata oluştu:", error);
    }
  };

  const handleCardAdded = () => {
    fetchCards();
    fetchBilledTransactions();
  };

  const handleCardUpdated = () => {
    fetchCards();
    fetchBilledTransactions();
  };

  return (
    <div className="page-container">
      <Tabs activeKey={activeTabKey} onChange={setActiveTabKey}>
        <TabPane tab="Kredi Kartlarım" key="1">
          <div className="page-header">
            <h1 className="page-title">Kredi Kartları</h1>
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
        </TabPane>
        <TabPane tab="Fatura Ekranı" key="2">
          <div className="dashboard-grid"> {/* Reusing dashboard-grid for layout */}
            {cards.length === 0 ? (
              <p>Gösterilecek kredi kartı bulunamadı.</p>
            ) : (
              cards.map((card) => {
                console.log("Rendering BillCard for card ID:", card.id);
                return (
                  <BillCard 
                    key={card.id} 
                    card={card} 
                    billedTransactions={billedTransactions[card.id] || {}} // Pass grouped transactions
                  />
                );
              })
            )}
          </div>
        </TabPane>
      </Tabs>
      
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
        onClose={() => setIsAddModalVisible(false)}
        onCardUpdated={handleCardUpdated}
        card={selectedCard}
      />
    </div>
  );
}