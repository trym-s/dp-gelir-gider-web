import React, { useState } from 'react';
import { Button, Input, Select, Upload, message, Spin, Typography, Alert } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
// importerService'in doğru yolda olduğundan emin ol. Genellikle api/ klasöründe olur.
import { parseFileOnServer } from '../../../../api/importerService'; 

const { Title, Text } = Typography;
const { Option } = Select;

const ImporterTestPage = () => {
  const [file, setFile] = useState(null);
  const [bankName, setBankName] = useState('İş Bankası');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [jsonResponse, setJsonResponse] = useState(null);

  const handleFileChange = (info) => {
    const selectedFile = info.fileList[0]?.originFileObj;
    if (selectedFile) {
      setFile(selectedFile);
    } else {
      setFile(null);
    }
  };

  const handleTest = async () => {
    if (!file || !bankName) {
      message.error("Lütfen bir PDF dosyası ve banka adı seçin.");
      return;
    }

    setLoading(true);
    setError(null);
    setJsonResponse(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'pdf');
    
    // --- DÜZELTME BURADA ---
    // Frontend'den gönderilen anahtar adını backend'in beklediği
    // 'bank_name' (snake_case) olarak güncelliyoruz.
    formData.append('bank_name', bankName);
    // --- DÜZELTME SONU ---

    try {
      const result = await parseFileOnServer(formData);
      console.log("✅ [Test Sayfası] Dönen JSON:", result);
      setJsonResponse(result);
      message.success(`${result.length} adet işlem başarıyla çözümlendi!`);
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || "Bilinmeyen bir hata oluştu.";
      console.error("❌ [Test Sayfası] API isteği başarısız:", errorMessage);
      setError(errorMessage);
      message.error("Dosya işlenemedi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: 'auto' }}>
      <Title level={3}>PDF Parser API Test Sayfası</Title>
      <Text type="secondary">Bu sayfa, PDF'ten JSON'a veri dönüştürme pipeline'ını test etmek için kullanılır.</Text>

      <div style={{ margin: '24px 0' }}>
        <Select 
          value={bankName} 
          onChange={setBankName} 
          style={{ width: 200, marginRight: 16 }}
        >
          <Option value="İş Bankası">İş Bankası</Option>
          <Option value="TEB">TEB</Option>
          <Option value="VakıfBank">VakıfBank</Option>
          <Option value="Ziraat Bankası">Ziraat Bankası</Option>
          <Option value="Yapı Kredi">Yapı Kredi</Option>
        </Select>

        <Upload
          accept=".pdf"
          beforeUpload={() => false}
          onChange={handleFileChange}
          maxCount={1}
          showUploadList={!!file}
        >
          <Button icon={<UploadOutlined />}>PDF Dosyası Seç</Button>
        </Upload>
      </div>

      <Button type="primary" onClick={handleTest} loading={loading} disabled={!file}>
        Test Et ve JSON'ı Gör
      </Button>

      {loading && <Spin style={{ display: 'block', marginTop: 24 }} />}
      
      {error && <Alert message="Hata" description={error} type="error" showIcon style={{ marginTop: 24 }} />}

      {jsonResponse && (
        <div style={{ marginTop: 24 }}>
          <Title level={4}>Dönen JSON Sonucu:</Title>
          <pre style={{ background: '#f5f5f5', border: '1px solid #ccc', padding: 16, borderRadius: 4, maxHeight: '500px', overflowY: 'auto' }}>
            {JSON.stringify(jsonResponse, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ImporterTestPage;