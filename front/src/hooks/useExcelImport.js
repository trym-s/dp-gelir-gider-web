import { useState } from 'react';
import { message, Modal } from 'antd';

export const useExcelImport = (uploadService, importService, expectedKeys, onImportSuccess) => {
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  const [uploadResults, setUploadResults] = useState({ valid: [], invalid: [] });
  const [editableRows, setEditableRows] = useState([]);
  const [activeTab, setActiveTab] = useState('invalid');
  const [loading, setLoading] = useState(false);

  const handleExcelUpload = async (options) => {
    const { file } = options;
    setLoading(true);
    try {
      const results = await uploadService(file);
      if (!Array.isArray(results)) {
        message.error("Sunucudan geçersiz bir yanıt formatı alındı.");
        return;
      }
      const valid = results.filter(r => r.status === 'valid');
      const invalid = results.filter(r => r.status === 'invalid');
      
      setUploadResults({ valid, invalid });
      setEditableRows(invalid.map(row => ({ ...row.data, key: row.row, errors: row.errors })));
      setActiveTab(invalid.length > 0 ? 'invalid' : 'valid');
      setIsUploadModalVisible(true);

    } catch (error) {
      const errorMsg = error.response?.data?.message || "Excel dosyası doğrulanırken bir hata oluştu.";
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCellChange = (key, dataIndex, value) => {
    setEditableRows(currentRows => {
      // Mevcut satırların bir kopyasını oluştur
      const newRows = [...currentRows];
      // Değiştirilecek satırın index'ini bul
      const targetIndex = newRows.findIndex(item => item.key === key);
      
      // Eğer satır bulunursa
      if (targetIndex > -1) {
        // O satırın bir kopyasını oluştur
        const updatedRow = { ...newRows[targetIndex] };
        // Kopyalanan satırın ilgili alanını yeni değerle güncelle
        updatedRow[dataIndex] = value;
        // Ana dizideki eski satırı, güncellenmiş yeni satırla değiştir
        newRows[targetIndex] = updatedRow;
      }
      
      // State'i yeni, güncellenmiş diziyle ayarla
      return newRows;
    });
  };

  const handleSaveImports = async () => {

    const rowsToImport = editableRows.filter(row => 
          (row.customer_id || row.is_new_customer) && 
          row.region_id && 
          row.account_name_id && 
          row.budget_item_id
    );

    if (rowsToImport.length === 0) {
        message.warning("İçe aktarılacak, tüm alanları doldurulmuş bir satır bulunamadı. Lütfen en az bir satırın tüm kategori alanlarını doldurun.");
        return;
    }


    const finalData = {
          corrected_rows: rowsToImport,
        };

    setLoading(true);
    try {
      const response = await importService(finalData);
      
      setIsUploadModalVisible(false);
      onImportSuccess();

      const failures = response.failures || [];
      if (failures.length > 0) {
        Modal.warning({
          title: 'İçe Aktarma Tamamlandı (Bazı Hatalar Var)',
          width: 600,
          content: (
            <div>
              <p><b>{response.successful_count} adet fatura başarıyla aktarıldı.</b></p>
              <p><b>{failures.length} adet faturada ise aşağıdaki hatalar oluştu:</b></p>
              <ul style={{ maxHeight: '200px', overflowY: 'auto', paddingLeft: '20px' }}>
                {failures.map((fail, index) => (
                  <li key={index}>
                    <b>{fail.invoice_name}:</b> {JSON.stringify(fail.error)}
                  </li>
                ))}
              </ul>
            </div>
          ),
        });
      } else if (response.successful_count > 0) {
        message.success(`${response.successful_count} adet fatura başarıyla içe aktarıldı!`);
      } else {
        message.info("İçe aktarılacak geçerli bir kayıt bulunamadı.");
      }
    } catch (error) {
      const errorData = error.response?.data;
      const errorMessage = errorData?.message || "Veriler içe aktarılırken bilinmeyen bir hata oluştu.";
      message.error(errorMessage, 5);
    } finally {
      setLoading(false);
    }
  };

  const closeUploadModal = () => {
    setIsUploadModalVisible(false);
  }

  return {
    isUploadModalVisible, uploadResults, editableRows, activeTab, loading,
    handleExcelUpload, handleCellChange, handleSaveImports, closeUploadModal, setActiveTab
  };
};