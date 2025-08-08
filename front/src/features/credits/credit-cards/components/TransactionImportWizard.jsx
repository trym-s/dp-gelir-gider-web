import React, { useState } from 'react';
import { Modal, Steps, Button, Typography, Spin, message } from 'antd';
import { FileProtectOutlined, CheckCircleOutlined, SmileOutlined } from '@ant-design/icons';
import { importTransactionsForCard } from '../../../../api/creditCardService';
import { parseFileOnServer } from '../../../../api/importerService';
import { mapAndValidateRow } from '../utils/transactionImportUtils';
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
  
  // Sadece banka adı state'i kaldı
  

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
    // Mantık sadeleşti, sadece PDF kontrolü yapılıyor
    if (fileList.length === 0) {
      message.error('Lütfen bir PDF dosyası seçin.');
      return;
    }
    if (!card || !card.bank_account || !card.bank_account.bank || !card.bank_account.bank.name) {
      message.error('Kredi kartı banka bilgisi eksik.');
      return;
    }
    
    setLoading(true);

    const formData = new FormData();
    formData.append('file', fileList[0]);
    formData.append('type', 'pdf'); // Her zaman pdf
    formData.append('bank_name', card.bank_account.bank.name);

    try {
      const rawData = await parseFileOnServer(formData);
      const processed = rawData.map(mapAndValidateRow);
      setProcessedRows(processed);
      const validKeys = processed.filter(r => r.status === 'valid').map(r => r.key);
      setSelectedRowKeys(validKeys);
      setCurrentStep(1);
    } catch (error) {
      const errorMessage = error.response?.data?.error || `Dosya işlenemedi: ${error.message}`;
      setImportResult({ status: 'error', message: errorMessage });
      setCurrentStep(2);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    // Bu fonksiyonun mantığı aynı kalıyor
    if (!card) {
      message.error("Kredi kartı bilgisi eksik.");
      return;
    }
    setLoading(true);

    const selectedKeysSet = new Set(selectedRowKeys);
    const importBatchId = crypto.randomUUID();
    const transactionsToImport = processedRows
      .filter(row => row.status === 'valid' && selectedKeysSet.has(row.key))
      .map(row => ({ ...row.cleanApiData, bill_id: importBatchId }));

    if (transactionsToImport.length === 0) {
        message.warning("İçe aktarılacak işlem seçilmedi.");
        setLoading(false);
        return;
    }

    try {
      await importTransactionsForCard(card.id, transactionsToImport);
      setImportResult({ status: 'success', count: transactionsToImport.length });
      setCurrentStep(2);
      onImportSuccess();
      
    } catch (error) {
      const errorMessage = error.response?.data?.error || "Sunucuyla iletişim kurulamadı.";
      setImportResult({ status: 'error', message: `İçe aktarım başarısız oldu: ${errorMessage}` });
      setCurrentStep(2);
    } finally {
      setLoading(false);
    }
  };

  // handleBack, steps, renderFooter gibi diğer fonksiyonlar aynı kalıyor...
  const handleBack = () => setCurrentStep(currentStep - 1);

  const steps = [
    { title: 'Ekstre Yükle', icon: <FileProtectOutlined /> },
    { title: 'Onayla', icon: <CheckCircleOutlined /> },
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
          {selectedRowKeys.length} İşlemi Aktar
        </Button>,
      ];
    }
    if (currentStep === 2) {
      return [<Button key="done" type="primary" onClick={handleClose}>Kapat</Button>];
    }
  };


  return (
    <Modal
      title={<Title level={4}>PDF Ekstre İçe Aktarma Sihirbazı</Title>}
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
            {currentStep === 0 && (
              <UploadStep 
                card={card} 
                fileList={fileList} setFileList={setFileList} 
              />
            )}
            {currentStep === 1 && <ReviewStep processedRows={processedRows} selectedRowKeys={selectedRowKeys} onSelectionChange={setSelectedRowKeys} />}
            {currentStep === 2 && <ResultStep result={importResult} />}
          </>
        )}
      </div>
    </Modal>
  );
};

export default TransactionImportWizard;