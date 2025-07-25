import React, { useState } from 'react';
import { Modal, Steps, Button, Typography, Spin, message } from 'antd'; // message'ı import ettik
import { FileProtectOutlined, CheckCircleOutlined, SmileOutlined } from '@ant-design/icons';

// API servislerini ve yardımcı fonksiyonları import edelim
import { importTransactionsForCard } from '../../../../api/creditCardService'; // YENİ SERVİS
import { parseXLSX } from '../utils/excelUtils';
import { mapAndValidateRow } from '../utils/transactionImportUtils';

// Adım bileşenlerini import edelim
import UploadStep from './wizard-steps/UploadStep';
import ReviewStep from './wizard-steps/ReviewStep';
import ResultStep from './wizard-steps/ResultStep';

const { Step } = Steps;
const { Title } = Typography;

const TransactionImportWizard = ({ visible, onClose, card, onImportSuccess }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [fileList, setFileList] = useState([]);
  const [processedRows, setProcessedRows] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const resetWizard = () => {
    setCurrentStep(0);
    setFileList([]);
    setProcessedRows([]);
    setSelectedRowKeys([]);
    setLoading(false);
    setImportResult(null);
  };

  const handleClose = () => {
    resetWizard();
    onClose();
  };

  const handleNext = async () => {
    if (currentStep === 0) {
      if (fileList.length === 0) {
        message.error('Lütfen bir dosya seçin.');
        return;
      }
      setLoading(true);
      try {
        const rawData = await parseXLSX(fileList[0]);
        const processed = rawData.map(mapAndValidateRow);
        setProcessedRows(processed);
        const validKeys = processed.filter(r => r.status === 'valid').map(r => r.key);
        setSelectedRowKeys(validKeys);
        setCurrentStep(1);
      } catch (error) {
        setImportResult({ status: 'error', message: `Dosya okunurken bir hata oluştu: ${error.message}` });
        setCurrentStep(2);
      } finally {
        setLoading(false);
      }
    }
  };

  // --- BURASI GÜNCELLENDİ ---
  const handleImport = async () => {
    if (!card) {
      message.error("Kredi kartı bilgisi eksik.");
      return;
    }
    setLoading(true);

    // 1. API'ye gönderilecek temiz işlem listesini hazırla
    const selectedKeysSet = new Set(selectedRowKeys);
    const transactionsToImport = processedRows
      .filter(row => row.status === 'valid' && selectedKeysSet.has(row.key))
      .map(row => row.cleanApiData); // Sadece API için hazırlanan temiz veriyi al

    if (transactionsToImport.length === 0) {
        message.warning("İçe aktarılacak işlem seçilmedi.");
        setLoading(false);
        return;
    }

    // 2. Yeni servis fonksiyonunu çağır
    try {
      await importTransactionsForCard(card.id, transactionsToImport);
      
      // 3. Başarı durumunu ayarla ve sonuç ekranına geç
      setImportResult({ status: 'success', count: transactionsToImport.length });
      setCurrentStep(2);
      onImportSuccess(); // Dashboard'u yenilemek için üst bileşeni uyar
      
    } catch (error) {
      // 4. Hata durumunu ayarla ve sonuç ekranına geç
      const errorMessage = error.response?.data?.error || "Sunucuyla iletişim kurulamadı.";
      setImportResult({ status: 'error', message: `İçe aktarım başarısız oldu: ${errorMessage}` });
      setCurrentStep(2);
    } finally {
      setLoading(false);
    }
  };
  // --- GÜNCELLEME SONU ---

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const steps = [
    { title: 'Dosya Yükle', icon: <FileProtectOutlined /> },
    { title: 'Onayla ve Düzenle', icon: <CheckCircleOutlined /> },
    { title: 'Sonuç', icon: <SmileOutlined /> },
  ];

  const renderFooter = () => {
    if (currentStep === 0) {
      return [
        <Button key="cancel" onClick={handleClose}>İptal</Button>,
        <Button key="next" type="primary" onClick={handleNext} loading={loading} disabled={fileList.length === 0}>İleri</Button>,
      ];
    }
    if (currentStep === 1) {
      return [
        <Button key="back" onClick={handleBack}>Geri</Button>,
        <Button key="import" type="primary" onClick={handleImport} loading={loading} disabled={selectedRowKeys.length === 0}>
          {selectedRowKeys.length} İşlemi İçe Aktar
        </Button>,
      ];
    }
    if (currentStep === 2) {
      return [<Button key="done" type="primary" onClick={handleClose}>Kapat</Button>];
    }
  };

  return (
    <Modal
      title={<Title level={4}>Harcama İçe Aktarma Sihirbazı</Title>}
      open={visible}
      onCancel={handleClose}
      footer={renderFooter()}
      width={currentStep === 1 ? 900 : 600}
      destroyOnClose
    >
      <Steps current={currentStep} style={{ marginBottom: 24, padding: '10px 0' }}>
        {steps.map(item => <Step key={item.title} title={item.title} icon={item.icon} />)}
      </Steps>

      <div className="wizard-content" style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {loading ? <Spin size="large" /> : (
          <>
            {currentStep === 0 && <UploadStep card={card} fileList={fileList} setFileList={setFileList} />}
            {currentStep === 1 && <ReviewStep processedRows={processedRows} selectedRowKeys={selectedRowKeys} onSelectionChange={setSelectedRowKeys} />}
            {currentStep === 2 && <ResultStep result={importResult} />}
          </>
        )}
      </div>
    </Modal>
  );
};

export default TransactionImportWizard;