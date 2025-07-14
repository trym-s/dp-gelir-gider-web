import React, { useState } from "react";
import { Table, DatePicker, Spin, Alert, Typography } from "antd";
import dayjs from "dayjs";
import { useExpenseReportData } from "../../hooks/useExpenseReportData";
import "./GiderRaporu.css";

const { Title } = Typography;

// Ana React Komponenti
export default function GiderRaporu() {
  const [seciliAy, setSeciliAy] = useState(dayjs());
  const { data, loading, error } = useExpenseReportData(seciliAy);

  const gunSayisi = seciliAy.daysInMonth();

  const columns = [
    { 
      title: "Harcama Grubu", 
      dataIndex: "ad", 
      key: "ad", 
      width: 220,
      render: (text, record) => {
        if (record.type === "odemeTuru") return <b style={{ fontSize: 17, color: "#003a8c" }}>{text}</b>;
        if (record.type === "butceKalemi") return <span style={{ paddingLeft: 20, fontWeight: 600, color: "#0958d9" }}>{text}</span>;
        if (record.type === "toplam") return <span style={{ paddingLeft: 40, fontWeight: 600, color: "#D46B08" }}>{text}</span>;
        if (record.type === "hesapAdi") return <span style={{ paddingLeft: 40, color: "#006" }}>{text}</span>;
        return text;
      },
    },
    ...Array.from({ length: gunSayisi }, (_, i) => ({
      title: i + 1,
      dataIndex: `gun${i + 1}`,
      key: `gun${i + 1}`,
      width: 56,
      align: "right",
      render: (value) => (value > 0 ? <b>{value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b> : "-"),
    })),
  ];

  function rowClassName(record) {
    if (record.type === "odemeTuru") return "grup-odeme";
    if (record.type === "butceKalemi") return "grup-kalem";
    if (record.type === "toplam") return "grup-toplam";
    if (record.type === "hesapAdi") return "grup-hesap";
    return "";
  }

  return (
    <div style={{ padding: "20px" }}>
      <Title level={2}>Gider Raporu</Title>
      <DatePicker 
        picker="month" 
        value={seciliAy} 
        onChange={setSeciliAy} 
        style={{ marginBottom: 16 }} 
        allowClear={false} 
      />
      
      {error && (
        <Alert
          message="Hata"
          description="Gider raporu verileri yüklenirken bir sorun oluştu. Lütfen daha sonra tekrar deneyin."
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Spin spinning={loading} tip="Yükleniyor..." size="large">
        <Table
          columns={columns}
          dataSource={data}
          pagination={false}
          bordered
          size="small"
          expandable={{ defaultExpandAllRows: true }}
          scroll={{ x: true }}
          rowKey="key"
          rowClassName={rowClassName}
        />
      </Spin>
    </div>
  );
}