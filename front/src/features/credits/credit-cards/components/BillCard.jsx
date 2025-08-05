import React, { useState } from 'react';
import { Typography, Collapse, List } from 'antd';
import '../styles/CreditCard.css'; // Reusing the same styles for visual consistency
import { formatCurrency } from '../utils/cardUtils'; // Assuming this utility exists
import TransactionDetailModal from './TransactionDetailModal'; // Import the modal

const { Text } = Typography;
const { Panel } = Collapse;

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
          <Collapse accordion expandIconPosition="end">
            {billIds.map(billId => (
              <Panel 
                header={`Fatura #${billId.substring(0, 8)}...`} 
                key={billId}
                showArrow={false} // Hide default arrow
                onClick={() => handleBillClick(billId)} // Open modal on click
                style={{ cursor: 'pointer' }} // Indicate clickability
              >
                {/* Content moved to modal */}
                <Text type="secondary">Detaylar için tıklayın.</Text>
              </Panel>
            ))}
          </Collapse>
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
