import { useState, useCallback } from 'react';
import { message, Modal } from 'antd';

export const useExcelImport = (uploadService, importService, onImportSuccess) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [uploadResults, setUploadResults] = useState({ needs_correction: [], duplicates: [] });
  const [editableRows, setEditableRows] = useState([]);
  const [activeTab, setActiveTab] = useState('needs_correction');
  const [loading, setLoading] = useState(false);
  const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);
  const [rowsToConfirm, setRowsToConfirm] = useState([]);

  const processUploadResults = useCallback((results) => {
    if (!Array.isArray(results)) {
      message.error("Sunucudan geçersiz bir yanıt formatı alındı.");
      return;
    }
    const needs_correction = results.filter(r => r.status === 'invalid');
    const duplicates = results.filter(r => r.status === 'duplicate');
    setUploadResults({ needs_correction, duplicates });
    setEditableRows(needs_correction.map(row => ({ ...row.data, key: row.row, errors: row.errors })));
    setActiveTab(needs_correction.length > 0 ? 'needs_correction' : 'duplicates');
    setIsModalVisible(true);
  }, []);

  const handleExcelUpload = useCallback(async ({ file }, service = uploadService) => {
    setLoading(true);
    try {
      const results = await service(file);
      processUploadResults(results);
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Excel dosyası işlenirken bir hata oluştu.";
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [uploadService, processUploadResults]);

  const handleCellChange = useCallback((key, dataIndex, value) => {
    setEditableRows(currentRows =>
      currentRows.map(row => {
        if (row.key === key) {
          return { ...row, [dataIndex]: value };
        }
        return row;
      })
    );
  }, []);

  const handleSaveImports = useCallback(() => {
    const rowsToImport = editableRows.filter(row =>
        (row.customer_id || row.is_new_customer) && row.region_id && row.account_name_id && row.budget_item_id
    );

    if (rowsToImport.length === 0) {
        message.warning("İçe aktarılacak, tüm kategori alanları doldurulmuş en az bir satır bulunamadı.");
        return;
    }
    setRowsToConfirm(rowsToImport);
    setIsConfirmationVisible(true);
  }, [editableRows]);

  const handleConfirmAndImport = useCallback(async () => {
    const finalData = { corrected_rows: rowsToConfirm };
    setLoading(true);
    setIsConfirmationVisible(false);

    try {
      const response = await importService(finalData);
      setIsModalVisible(false);
      onImportSuccess();

      const successful_count = response.successful_count || 0;
      const failures = response.failures || [];

      // --- HATA GÖSTERİMİNİ DAHA DETAYLI HALE GETİRDİK ---
      if (failures.length > 0) {
        // Hem başarılı hem de başarısız kayıt varsa, detaylı bir uyarı göster
        Modal.warning({
          title: `İçe Aktarma Tamamlandı: ${successful_count} Başarılı, ${failures.length} Hatalı`,
          width: 600,
          content: (
            <div>
              <p>Aşağıdaki faturalar, belirtilen hatalar nedeniyle içe aktarılamadı:</p>
              <ul style={{ maxHeight: '200px', overflowY: 'auto', paddingLeft: '20px', border: '1px solid #eee', marginTop: '10px', padding: '10px' }}>
                {failures.map((fail, index) => (
                  <li key={index}>
                    <b>{fail.invoice_name || 'İsimsiz Fatura'}:</b> 
                    <span style={{ color: 'red', marginLeft: '5px' }}>{fail.error}</span>
                  </li>
                ))}
              </ul>
            </div>
          ),
          okText: 'Anladım'
        });
      } else if (successful_count > 0) {
        // Sadece başarılı kayıt varsa, basit bir başarı mesajı göster
        message.success(`${successful_count} adet fatura başarıyla içe aktarıldı!`);
      } else {
        // Hiçbir kayıt eklenmediyse, bilgi mesajı göster
        message.info("İçe aktarma işlemi tamamlandı ancak yeni kayıt eklenmedi.");
      }
      // --- DEĞİŞİKLİK SONU ---

    } catch (error) {
      message.error(error.response?.data?.message || "Veriler içe aktarılırken bir sunucu hatası oluştu.", 5);
    } finally {
      setLoading(false);
    }
  }, [rowsToConfirm, importService, onImportSuccess, setIsModalVisible]);
  const closeUploadModal = useCallback(() => {
    setIsModalVisible(false);
  }, []);

  return {
    isModalVisible,
    uploadResults,
    editableRows,
    activeTab,
    loading,
    isConfirmationVisible,
    rowsToConfirm,
    handleExcelUpload,
    handleCellChange,
    handleSaveImports,
    closeUploadModal,
    setActiveTab,
    handleConfirmAndImport,
    setIsConfirmationVisible,
    setLoading,
    setUploadResults,
    setEditableRows,
    setIsModalVisible,
  };
};