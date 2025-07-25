import React, { useState } from 'react';
import { Modal, Button, Upload, message, Typography, Spin } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { parseXLSX } from '../utils/excelUtils';
import { mapAndValidateRow, preparePayloadForApi } from '../utils/transactionImportUtils';
import { addTransactionToCard } from '../../../../api/creditCardService';
import TransactionConfirmationStep from './TransactionConfirmationStep';

const { Dragger } = Upload;
const { Text, Title } = Typography;

const TransactionImportModal = ({ visible, onClose, card }) => {
  const [fileList, setFileList] = useState([]);
  const [parsedTransactions, setParsedTransactions] = useState([]); // This will now hold the mapped and validated rows
  const [showConfirmationStep, setShowConfirmationStep] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  const draggerProps = {
    name: 'file',
    multiple: false,
    accept: '.xlsx',
    fileList: fileList,
    onRemove: () => {
      setFileList([]);
      setParsedTransactions([]);
      setShowConfirmationStep(false);
      setSelectedRowKeys([]);
    },
    beforeUpload: (file) => {
      const isXlsx = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.name.endsWith('.xlsx');
      if (!isXlsx) {
        message.error('Sadece .xlsx formatındaki dosyaları yükleyebilirsiniz!');
      } else {
        setFileList([file]);
      }
      return false; // Prevent automatic upload
    },
  };

  const handleNext = async () => {
    if (fileList.length === 0) {
      message.error('Lütfen bir dosya seçin.');
      return;
    }
    setLoading(true);
    try {
      const rawData = await parseXLSX(fileList[0]);
      console.log("Raw data from XLSX:", rawData); // Add this line
      const processedData = rawData.map(row => mapAndValidateRow(row));
      setParsedTransactions(processedData);
      setShowConfirmationStep(true);
    } catch (error) {
      message.error('Dosya okunurken bir hata oluştu: ' + error.message);
      console.error('Error parsing XLSX:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setShowConfirmationStep(false);
    setParsedTransactions([]);
    setSelectedRowKeys([]);
  };

  const handleClose = () => {
    setFileList([]);
    setParsedTransactions([]);
    setShowConfirmationStep(false);
    setSelectedRowKeys([]);
    onClose();
  };

  const handleImport = async () => {
    if (!card) {
      message.error("Kredi kartı bilgisi eksik.");
      return;
    }
    const payload = preparePayloadForApi(parsedTransactions, new Set(selectedRowKeys), card.id);
    setLoading(true);
    try {
      await addTransactionToCard(card.id, payload.transactions);
      message.success('Seçilen işlemler başarıyla içe aktarıldı!');
      handleClose();
    } catch (error) {
      message.error('İşlemler içe aktarılırken bir hata oluştu.');
      console.error('Error importing transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={<Title level={4}>Harcama Listesi İçe Aktar</Title>}
      open={visible}
      onCancel={handleClose}
      footer={[
        <Button key="back" onClick={handleClose}>
          İptal
        </Button>,
        <Button key="submit" type="primary" onClick={handleNext} disabled={fileList.length === 0}>
          İleri
        </Button>,
      ]}
    >
      {card && (
         <Text>Hedef Kart: {card.name} ({card.bank_account?.bank?.name})</Text>
      )}
      {showConfirmationStep ? (
        <TransactionConfirmationStep
          transactions={parsedTransactions}
          selectedRowKeys={selectedRowKeys}
          onSelectionChange={setSelectedRowKeys}
          onBack={handleBack}
          onImport={handleImport}
          onCancel={handleClose}
        />
      ) : (
        <div style={{ marginTop: '20px' }} onClick={(e) => e.stopPropagation()}>
          <Dragger {...draggerProps}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Dosya Seçmek İçin Tıklayın veya Sürükleyip Bırakın</p>
          </Dragger>
          <Text type="secondary" style={{ marginTop: '10px', display: 'block' }}>
            Lütfen bankanızdan indirdiğiniz .xlsx formatındaki ekstre dosyasını seçin.
          </Text>
        </div>
      )}
    </Modal>
  );
};

export default TransactionImportModal;