import React, { useState } from 'react';
import { Modal, Button, Upload, message, Typography } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import TransactionConfirmationStep from './TransactionConfirmationStep';

const { Dragger } = Upload;
const { Text, Title } = Typography;

const TransactionImportModal = ({ visible, onClose, card }) => {
  const [step, setStep] = useState(1);
  const [fileList, setFileList] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  const draggerProps = {
    name: 'file',
    multiple: false,
    accept: '.xlsx',
    fileList: fileList,
    onRemove: () => {
      setFileList([]);
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

  const handleNext = () => {
    // Mock data for the confirmation step
    const mockTransactions = [
      { key: '1', date: '02/05/2025', description: 'KABANA RESTAURANT...', amount: '8.814,72', status: 'valid' },
      { key: '2', date: '03/05/2025', description: 'SUBWAY DUBAI AE...', amount: '980,29', status: 'valid' },
      { key: '3', date: '03/05/2025', description: 'SOCIAL ADS EXPERT...', amount: '787,88', status: 'valid' },
      { key: '4', date: '04/05/2025', description: 'THE COFFEE CLUB...', amount: '958,12', status: 'invalid', error: 'Geçersiz tarih' },
    ];
    setTransactions(mockTransactions);
    setSelectedRowKeys(mockTransactions.filter(t => t.status === 'valid').map(t => t.key));
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleImport = () => {
    // Handle the import logic here
    console.log('Importing transactions:', selectedRowKeys);
    handleClose();
  };

  const handleClose = () => {
    setStep(1);
    setFileList([]);
    setTransactions([]);
    setSelectedRowKeys([]);
    onClose();
  };

  return (
    <Modal
      title={<Title level={4}>{step === 1 ? 'Harcama Listesi İçe Aktar' : 'İşlemleri Onayla'}</Title>}
      open={visible}
      onCancel={handleClose}
      footer={null} // Footer is handled by the steps
      width={step === 2 ? 800 : 520}
    >
      {step === 1 ? (
        <div>
          {card && (
            <Text>Hedef Kart: {card.name} ({card.bank_account?.bank?.name})</Text>
          )}
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
          <div style={{ marginTop: 24, textAlign: 'right' }}>
            <Button key="back" onClick={handleClose} style={{ marginRight: 8 }}>
              İptal
            </Button>
            <Button key="submit" type="primary" onClick={handleNext} disabled={fileList.length === 0}>
              İleri
            </Button>
          </div>
        </div>
      ) : (
        <TransactionConfirmationStep
          transactions={transactions}
          selectedRowKeys={selectedRowKeys}
          onSelectionChange={setSelectedRowKeys}
          onBack={handleBack}
          onImport={handleImport}
          onCancel={handleClose}
        />
      )}
    </Modal>
  );
};

export default TransactionImportModal;
