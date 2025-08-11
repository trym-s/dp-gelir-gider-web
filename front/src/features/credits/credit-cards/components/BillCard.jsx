import React, { useState } from 'react';
import { Typography, List, Button } from 'antd'; // Added Button
import { UploadOutlined } from '@ant-design/icons'; // Added UploadOutlined
import '../styles/CreditCard.css'; // Reusing the same styles for visual consistency
import { formatCurrency } from '../utils/cardUtils'; // Assuming this utility exists
import TransactionDetailModal from './TransactionDetailModal'; // Import the modal
import TransactionImportWizard from './TransactionImportWizard'; // Import the wizard

const { Text } = Typography;

import { bankLogoMap } from '../../../../icons/bankLogoMap';

const BillCard = ({ card, billedTransactions, onImportSuccess: onDashboardImportSuccess }) => {
  console.log(`BillCard for card ${card.id}: received billedTransactions`, billedTransactions);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedBillTransactions, setSelectedBillTransactions] = useState([]);
  const [importWizardVisible, setImportWizardVisible] = useState(false); // State for wizard visibility

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

  const handleImportClick = (e) => {
    e.stopPropagation(); // Prevent card click if any
    setImportWizardVisible(true);
  };

  const handleCloseImportWizard = () => {
    setImportWizardVisible(false);
  };

  const handleImportSuccess = () => {
    handleCloseImportWizard();
    if (onDashboardImportSuccess) {
      onDashboardImportSuccess(); // Trigger refresh in parent dashboard
    }
  };

  return (
    <div className="card card-static"> {/* Using card-static for non-interactive display */}
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src={logoUrl} alt={`${bankName} Logo`} style={{ height: '24px', width: 'auto' }} />
            <span className="bank-name">{bankName}</span>
        </div>
        <Button
          type="text"
          icon={<UploadOutlined />}
          onClick={handleImportClick}
          className="import-button" // Reusing class from CreditCard.jsx
        />
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

      <TransactionImportWizard
        visible={importWizardVisible}
        onClose={handleCloseImportWizard}
        card={card}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  );
};

export default BillCard;
