// front/src/features/expenses/components/import-wizard/steps/UploadStep.jsx
import React from "react";
import { Space, Alert, Upload, Button, InputNumber, Typography, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
const { Text } = Typography;

export default function UploadStep({ file, setFile, sheet, setSheet, onCancel, onUpload }) {
  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <Alert type="info" showIcon message="PDF/XLSX dosyanı yükle. Gerekirse sheet index’i belirt." />
      <Upload.Dragger
        beforeUpload={(f) => {
          const ok = /(\.xlsx|\.xls|\.csv|\.pdf)$/i.test(f.name);
          if (!ok) {
            message.error("Sadece PDF/Excel dosyaları");
            return Upload.LIST_IGNORE;
          }
          setFile(f);
          return false;
        }}
        multiple={false}
        fileList={file ? [file] : []}
        onRemove={() => setFile(null)}
      >
        <p className="ant-upload-drag-icon"><UploadOutlined /></p>
        <p className="ant-upload-text">Dosyayı sürükle-bırak ya da tıkla</p>
      </Upload.Dragger>

      <Space>
        <Text>Sheet (index):</Text>
        <InputNumber min={0} value={sheet} onChange={setSheet} />
      </Space>

      <Space style={{ justifyContent: "flex-end", width: "100%" }}>
        <Button onClick={onCancel}>İptal</Button>
        <Button type="primary" onClick={onUpload} disabled={!file}>Yükle</Button>
      </Space>
    </Space>
  );
}
