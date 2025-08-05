import React from 'react';
import { Upload, Typography, Alert, Space } from 'antd';
import { FilePdfOutlined } from '@ant-design/icons';
import '../styles/UploadStep.css'; // Yeni stil dosyasını ekleyeceğiz

const { Dragger } = Upload;
const { Text, Title } = Typography;

const UploadStep = ({ card, fileList, setFileList }) => {
  
  const draggerProps = {
    name: 'file',
    multiple: false,
    accept: '.pdf', // Sadece PDF kabul et
    fileList: fileList,
    onRemove: () => setFileList([]),
    beforeUpload: (file) => {
      setFileList([file]);
      return false; 
    },
  };

  return (
    <div className="upload-step-container">
      <Alert
        message={<Text strong>Hedef Kart: {card?.name} ({card?.bank_account?.bank?.name})</Text>}
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div className="upload-instruction-block">
          <div className="instruction-number">1</div>
           <div>
            <Title level={5} style={{marginTop: 0}}>PDF Ekstre Yükle</Title>
            <Text type="secondary">Bankadan indirdiğiniz PDF formatındaki kredi kartı ekstresini yükleyin.</Text>
          </div>
        </div>
        <Dragger {...draggerProps}>
          <p className="ant-upload-drag-icon"><FilePdfOutlined /></p>
          <p className="ant-upload-text">PDF Dosyasını Buraya Sürükleyin veya Tıklayın</p>
          <p className="ant-upload-hint">Yüklemek istediğiniz PDF ekstresini buraya sürükleyin.</p>
        </Dragger>
      </Space>
    </div>
  );
};

export default UploadStep;
