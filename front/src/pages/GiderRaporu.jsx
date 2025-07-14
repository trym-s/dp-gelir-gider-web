import React, { useState, useEffect } from "react";
import { Table, DatePicker } from "antd";
import dayjs from "dayjs";
import axios from "axios";
import "./GiderRaporu.css";

// Pivot verisini işleyen fonksiyon
function getPivotData(giderler = [], year, month, gunSayisi) {
  const hiyerarsi = {};

  giderler.forEach((g) => {
    const date = dayjs(g.date);
    if (date.year() !== year || date.month() + 1 !== month) return;

    // --- ÖNEMLİ DEĞİŞİKLİK: Backend'den gelen iç içe geçmiş veriyi doğru kullanıyoruz ---
    const odemeTuru = g.payment_type?.name || 'Belirtilmemiş';
    const butceKalemi = g.budget_item?.name || 'Belirtilmemiş';
    const hesapAdi = g.account_name?.name || 'Belirtilmemiş';
    // --------------------------------------------------------------------------

    if (!hiyerarsi[odemeTuru]) hiyerarsi[odemeTuru] = {};
    if (!hiyerarsi[odemeTuru][butceKalemi]) hiyerarsi[odemeTuru][butceKalemi] = {};
    if (!hiyerarsi[odemeTuru][butceKalemi][hesapAdi])
      hiyerarsi[odemeTuru][butceKalemi][hesapAdi] = Array(gunSayisi).fill(0);
    
    const gun = date.date();
    hiyerarsi[odemeTuru][butceKalemi][hesapAdi][gun - 1] += g.amount;
  });

  // Ant Design Table formatına dönüştürme (Bu kısımda değişiklik yok)
  const rows = [];
  Object.entries(hiyerarsi).forEach(([odemeTuru, kalemler], idx1) => {
    const odemeRow = { key: `odeme-${idx1}`, type: "odemeTuru", ad: odemeTuru, children: [] };
    Object.entries(kalemler).forEach(([butceKalemi, hesaplar], idx2) => {
      const kalemRow = { key: `kalem-${idx1}-${idx2}`, type: "butceKalemi", ad: butceKalemi, children: [] };
      Object.entries(hesaplar).forEach(([hesapAdi, tutarlar], idx3) => {
        const hesapRow = { key: `hesap-${idx1}-${idx2}-${idx3}`, type: "hesapAdi", ad: hesapAdi };
        for (let i = 1; i <= gunSayisi; i++) {
          hesapRow[`gun${i}`] = tutarlar[i - 1] || 0;
        }
        kalemRow.children.push(hesapRow);
      });
      const toplamlar = Array(gunSayisi).fill(0);
      Object.values(hesaplar).forEach((tutarlar) => {
        for (let i = 0; i < gunSayisi; i++) {
          toplamlar[i] += tutarlar[i] || 0;
        }
      });
      const toplamRow = { key: `toplam-${idx1}-${idx2}`, type: "toplam", ad: <span style={{ fontWeight: 600, color: "#D46B08" }}>Toplam</span> };
      for (let i = 1; i <= gunSayisi; i++) {
        toplamRow[`gun${i}`] = toplamlar[i - 1] || 0;
      }
      kalemRow.children.push(toplamRow);
      odemeRow.children.push(kalemRow);
    });
    rows.push(odemeRow);
  });
  return rows;
}

// Ana React Komponenti
export default function GiderRaporu() {
  const [seciliAy, setSeciliAy] = useState(dayjs());
  const [giderler, setGiderler] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const baslangicTarihi = seciliAy.startOf('month').format('YYYY-MM-DD');
    const bitisTarihi = seciliAy.endOf('month').format('YYYY-MM-DD');
    const apiUrl = `http://localhost:5000/api/expenses?date_start=${baslangicTarihi}&date_end=${bitisTarihi}`;

    axios.get(apiUrl)
      .then(response => {
        // Backend'den gelen veri { "data": [...] } yapısında olduğu için .data anahtarını kullanıyoruz.
        setGiderler(response.data.data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Veri çekilirken hata oluştu:", error);
        setLoading(false);
      });
  }, [seciliAy]);

  const gunSayisi = seciliAy.daysInMonth();
  const year = seciliAy.year();
  const month = seciliAy.month() + 1;
  const data = getPivotData(giderler, year, month, gunSayisi);

  const columns = [
    { title: "Ad", dataIndex: "ad", key: "ad", width: 220,
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
      width: 56,
      align: "right",
      render: (value) => value > 0 ? <b>{value.toFixed(2)}</b> : "-",
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
      <h2>Gider Raporu</h2>
      <DatePicker picker="month" value={seciliAy} onChange={setSeciliAy} style={{ marginBottom: 16 }} allowClear={false} />
      <Table
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={false}
        bordered
        size="small"
        expandable={{ defaultExpandAllRows: true }}
        scroll={{ x: true }}
        rowKey="key"
        rowClassName={rowClassName}
      />
    </div>
  );
}