import React, { useState } from 'react';
import { Typography, List, Card } from 'antd'; // Changed Collapse to Card for individual bill display
import '../styles/CreditCard.css'; // Reusing the same styles for visual consistency
import { formatCurrency } from '../utils/cardUtils'; // Assuming this utility exists
import TransactionDetailModal from './TransactionDetailModal'; // Import the modal

const { Text } = Typography;

// Banka logoları haritası (CreditCard.jsx dosyasından kopyalanmıştır)
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
  'default': '/default-bank-logo.png' 
};

const BillCard = ({ card, billedTransactions }) => {
  console.log(`BillCard for card ${card.id}: received billedTransactions`, billedTransactions);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedBillTransactions, setSelectedBillTransactions] = useState([]);

  if (!card) {
    console.warn("BillCard Bileşeni: 'card' prop'u geçersiz veya eksik.");
    return null;
  }

  const bankName = card.bank_account?.bank?.name || card.bank_name || 'Bilinmiyor'; 
  const cardName = card.name || 'Kart Bilgisi Yok';
  const logoUrl = bankLogoMap[bankName] || bankLogoMap['default'];

  const displayCardNumber = (number) => {
    if (!number) return '**** **** **** ****';
    if (typeof number === 'string' && number.includes('****')) {
        return number;
    }
    if (typeof number === 'string' && number.length >= 16) {
        return `${number.slice(0, 4)} **** **** ${number.slice(-4)}`;
    }
    return '**** **** **** ****';
  };

  const billIds = Object.keys(billedTransactions);

  const handleBillClick = (billId) => {
    setSelectedBillTransactions(billedTransactions[billId]);
    setIsModalVisible(true);
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
    setSelectedBillTransactions([]);
  };

  return (
    <div className="card card-static"> {/* Using card-static for non-interactive display */}
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src={logoUrl} alt={`${bankName} Logo`} style={{ height: '24px', width: 'auto' }} />
            <span className="bank-name">{bankName}</span>
        </div>
      </div>

      <p className="card-name">{cardName}</p>
      
      <div style={{ fontSize: '0.95rem', color: '#4a5568', marginBottom: '8px' }}>
          Kart No: <span style={{ fontWeight: '600' }}>{displayCardNumber(card.credit_card_no)}</span>
      </div>

      <div style={{ marginTop: '15px' }}>
        {billIds.length === 0 ? (
          <Text type="secondary">Bu karta ait faturalandırılmış işlem bulunmamaktadır.</Text>
        ) : (
          <List
            dataSource={billIds}
            renderItem={billId => {
              const transactionsForBill = billedTransactions[billId];
              const totalAmount = transactionsForBill.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
              const transactionCount = transactionsForBill.length;

              return (
                <List.Item
                  onClick={() => handleBillClick(billId)}
                  style={{
                    cursor: 'pointer',
                    padding: '12px 16px',
                    marginBottom: '8px',
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0',
                    transition: 'all 0.3s',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                    backgroundColor: '#fff',
                  }}
                  className="bill-list-item" // Add a class for potential external styling
                >
                  <List.Item.Meta
                    title={<Text strong>{`Fatura #${billId.substring(0, 8)}...`}</Text>}
                    description={
                      <Text type="secondary">
                        {`Toplam İşlem: ${transactionCount} adet | Tutar: ${formatCurrency(totalAmount)}`}
                      </Text>
                    }
                  />
                </List.Item>
              );
            }}
          />
        )}
      </div>

      <TransactionDetailModal 
        visible={isModalVisible}
        onCancel={handleModalClose}
        transactions={selectedBillTransactions}
      />
    </div>
  );
};

export default BillCard;