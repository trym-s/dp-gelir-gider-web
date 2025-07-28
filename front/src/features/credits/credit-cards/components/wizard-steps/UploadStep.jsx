import React from 'react';
import { Upload, Typography, Alert, Select, Space, Steps } from 'antd';
import { InboxOutlined, BankOutlined, FilePdfOutlined } from '@ant-design/icons';
import '../styles/UploadStep.css'; // Yeni stil dosyasını ekleyeceğiz

const { Dragger } = Upload;
const { Text, Title } = Typography;
const { Option } = Select;

const supportedBanks = ["İş Bankası", "TEB", "VakıfBank", "Ziraat Bankası", "Yapı Kredi"];

const UploadStep = ({ card, fileList, setFileList, bankName, setBankName }) => {
  
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
        message={<Text strong>Hedef Kart: {card?.name}</Text>}
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div className="upload-instruction-block">
          <div className="instruction-number">1</div>
          <div>
            <Title level={5} style={{marginTop: 0}}>Banka Seçimi</Title>
            <Text type="secondary">Lütfen PDF ekstrenin ait olduğu bankayı seçin.</Text>
          </div>
        </div>
        <Select 
          placeholder="Banka seçimi yapınız..." 
          value={bankName} 
          onChange={setBankName}
          style={{ width: '100%' }}
          size="large"
          suffixIcon={<BankOutlined />}
        >
          {supportedBanks.map(bank => <Option key={bank} value={bank}>{bank}</Option>)}
        </Select>

        <div className="upload-instruction-block">
          <div className="instruction-number">2</div>
           <div>
            <Title level={5} style={{marginTop: 0}}>PDF Ekstre Yükle</Title>
            <Text type="secondary">Bankadan indirdiğiniz PDF formatındaki kredi kartı ekstresini yükleyin.</Text>
          </div>
        </div>
        <Dragger {...draggerProps} disabled={!bankName}>
          <p className="ant-upload-drag-icon"><FilePdfOutlined /></p>
          <p className="ant-upload-text">PDF Dosyasını Buraya Sürükleyin veya Tıklayın</p>
          <p className="ant-upload-hint">Lütfen devam etmeden önce bir banka seçtiğinizden emin olun.</p>
        </Dragger>
      </Space>
    </div>
  );
};

export default UploadStep;