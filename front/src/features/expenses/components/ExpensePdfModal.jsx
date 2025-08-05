// src/features/expenses/components/ExpensePdfModal.jsx

import React, { useState, useEffect } from 'react';
import { Modal, Upload, message, List, Button, Spin, Typography } from 'antd';
import { InboxOutlined, PaperClipOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
// YENİ SERVİSİ import ediyoruz
import { getPdfsForExpense, uploadPdfForExpense, deletePdf } from '../../../api/expensePdfService';

const { Dragger } = Upload;
const { Text, Link } = Typography;

const ExpensePdfModal = ({ expenseId, visible, onCancel, onUpdate }) => {
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPdfs = async () => {
    if (!expenseId) return;
    setLoading(true);
    try {
      const data = await getPdfsForExpense(expenseId);
      setPdfs(data);
    } catch (error) {
      message.error('Dosyalar getirilirken bir hata oluştu.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && expenseId) {
      fetchPdfs();
    }
  }, [expenseId, visible]);

  const handleUpload = async (options) => {
    const { file, onSuccess, onError } = options;
    try {
      await uploadPdfForExpense(expenseId, file);
      onSuccess("Ok");
      message.success(`${file.name} başarıyla yüklendi.`);
      fetchPdfs(); // Listeyi yenile
      if (onUpdate) onUpdate(); // Ana Gider listesini yenile
    } catch (error) {
      onError(error);
      message.error(`${file.name} yüklenirken bir hata oluştu.`);
    }
  };

  const handleDelete = async (pdfId) => {
    try {
      await deletePdf(pdfId);
      message.success('Dosya silindi.');
      fetchPdfs(); // Listeyi yenile
      if (onUpdate) onUpdate(); // Ana Gider listesini yenile
    } catch (error) {
      message.error('Dosya silinirken bir hata oluştu.');
    }
  };

  return (
    <Modal
      title={`Gider #${expenseId} için Dosyalar`}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={600}
      destroyOnClose={true}
    >
      <Dragger customRequest={handleUpload} multiple={true} showUploadList={false} accept=".png,.jpg,.jpeg,.pdf">
        <p className="ant-upload-drag-icon"><InboxOutlined /></p>
        <p className="ant-upload-text">Yeni Dosya Ekle</p>
        <p className="ant-upload-hint">Dosyaları buraya sürükleyin veya seçmek için tıklayın</p>
      </Dragger>

      <Spin spinning={loading}>
        <List
          header={<Text strong>Yüklenmiş Dosyalar</Text>}
          dataSource={pdfs}
          locale={{ emptyText: 'Bu gidere ait dosya bulunmuyor.' }}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Link href={item.url} target="_blank" rel="noopener noreferrer">
                    <Button icon={<EyeOutlined />}>Görüntüle</Button>
                </Link>,
                <Button icon={<DeleteOutlined />} onClick={() => handleDelete(item.id)} danger>Sil</Button>
              ]}
            >
              <List.Item.Meta avatar={<PaperClipOutlined />} title={item.original_filename} />
            </List.Item>
          )}
          style={{ marginTop: 24 }}
        />
      </Spin>
    </Modal>
  );
};

export default ExpensePdfModal;