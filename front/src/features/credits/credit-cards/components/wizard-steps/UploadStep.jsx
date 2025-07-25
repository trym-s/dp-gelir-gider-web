import React from 'react';
import { Upload, Typography, Alert } from 'antd';
import { InboxOutlined } from '@ant-design/icons';

const { Dragger } = Upload;
const { Text } = Typography;

const UploadStep = ({ card, fileList, setFileList }) => {
  const draggerProps = {
    name: 'file',
    multiple: false,
    accept: '.xlsx',
    fileList: fileList,
    onRemove: () => setFileList([]),
    beforeUpload: (file) => {
      setFileList([file]);
      return false; // Otomatik yüklemeyi engelle
    },
  };

  return (
    <div style={{ width: '100%' }}>
      <Alert
        message={<Text strong>Hedef Kart: {card?.name}</Text>}
        description="Bu karta ait banka ekstresini yükleyerek işlemleri kolayca ekleyebilirsiniz."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />
      <Dragger {...draggerProps}>
        <p className="ant-upload-drag-icon"><InboxOutlined /></p>
        <p className="ant-upload-text">Dosya Seçmek İçin Tıklayın veya Sürükleyin</p>
        <p className="ant-upload-hint">Sadece .xlsx formatı desteklenmektedir. Lütfen dosyanın "İşlem Tarihi", "Açıklama" ve "Tutar (TL)" sütunlarını içerdiğinden emin olun.</p>
      </Dragger>
    </div>
  );
};

export default UploadStep;