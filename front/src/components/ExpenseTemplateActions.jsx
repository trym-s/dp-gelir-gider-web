import React, { useRef, useState } from "react";
import { Button, Modal, Table, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { api } from '../api/api';

export default function ExpenseTemplateActions({ onUploadSuccess }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [errorRows, setErrorRows] = useState([]);
  const [successRows, setSuccessRows] = useState([]);
  const [resultModalVisible, setResultModalVisible] = useState(false);

  // Excel şablonunu indir
  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get("/expenses/template", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "gider_taslak.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      message.error("Şablon indirilemedi!");
    }
  };

  // Excel dosyası seçildiğinde çalışır
  const handleUploadClick = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/expenses/import", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setErrorRows(res.data.error_rows || []);
      setSuccessRows(res.data.success_rows || []);
      setResultModalVisible(true);

      // Tabloyu otomatik yenile (isteğe bağlı)
      if (res.data.success_rows && res.data.success_rows.length > 0 && onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (err) {
      message.error("Excel yüklenemedi: " + (err.response?.data?.error || err.message));
    }
    setUploading(false);
    e.target.value = ""; // Aynı dosya tekrar seçilebilsin
  };

  const columns = [
    { title: "Satır No", dataIndex: "row", key: "row", width: 80 },
    { title: "Hatalar", dataIndex: "errors", key: "errors", render: (errors) => errors.join("; ") }
  ];

  return (
    <div style={{ display: "inline-block" }}>
      <Button onClick={handleDownloadTemplate} style={{ marginRight: 8 }}>
        Taslak İndir
      </Button>
      <Button
        type="primary"
        icon={<UploadOutlined />}
        loading={uploading}
        onClick={handleUploadClick}
      >
        Taslak Yükle
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx, .xls"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <Modal
        title="Excel Yükleme Sonucu"
        open={resultModalVisible}
        onCancel={() => setResultModalVisible(false)}
        footer={null}
      >
        {successRows.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <b>{successRows.length} satır başarıyla eklendi!</b>
          </div>
        )}
        {errorRows.length > 0 && (
          <Table
            dataSource={errorRows}
            columns={columns}
            rowKey="row"
            pagination={false}
            size="small"
          />
        )}
        {errorRows.length === 0 && successRows.length === 0 && (
          <div>Herhangi bir veri işlenmedi.</div>
        )}
      </Modal>
    </div>
  );
}
