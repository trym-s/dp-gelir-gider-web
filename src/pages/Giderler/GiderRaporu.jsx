import React, { useState } from "react";
import { Table, DatePicker } from "antd";
import dayjs from "dayjs";
import "./GiderRaporu.css"; // Stil için CSS ekleyeceğiz

// Örnek gider verisi
const giderler = [
  {
    odemeTuru: "Ticari Ödemeler",
    butceKalemi: "Araç Giderleri",
    hesapAdi: "HGS Ödemesi",
    tutar: 50,
    tarih: "2024-07-03",
  },
  {
    odemeTuru: "Ticari Ödemeler",
    butceKalemi: "Araç Giderleri",
    hesapAdi: "Yakıt",
    tutar: 200,
    tarih: "2024-07-03",
  },
  {
    odemeTuru: "Ticari Ödemeler",
    butceKalemi: "Araç Giderleri",
    hesapAdi: "Yakıt",
    tutar: 100,
    tarih: "2024-07-05",
  },
  {
    odemeTuru: "Ticari Ödemeler",
    butceKalemi: "Ofis Giderleri",
    hesapAdi: "Kırtasiye",
    tutar: 75,
    tarih: "2024-07-05",
  },
  {
    odemeTuru: "Finansal Ödemeler",
    butceKalemi: "Kredi Faizleri",
    hesapAdi: "Kredi Kartı Faizi",
    tutar: 100,
    tarih: "2024-07-10",
  },
  {
    odemeTuru: "Finansal Ödemeler",
    butceKalemi: "Kredi Faizleri",
    hesapAdi: "Taksit Gideri",
    tutar: 150,
    tarih: "2024-07-15",
  },
  {
    odemeTuru: "Diğer Ödemeler",
    butceKalemi: "Sosyal Yardım",
    hesapAdi: "Bağış",
    tutar: 200,
    tarih: "2024-07-12",
  },
];

// Pivot fonksiyonu, toplam satırı ekleyerek
function getPivotData(giderler, year, month, gunSayisi) {
  // Data structure: odemeTuru > butceKalemi > hesapAdi > gün
  const hiyerarsi = {};

  giderler.forEach((g) => {
    const date = dayjs(g.tarih);
    if (date.year() !== year || date.month() + 1 !== month) return;
    if (!hiyerarsi[g.odemeTuru]) hiyerarsi[g.odemeTuru] = {};
    if (!hiyerarsi[g.odemeTuru][g.butceKalemi]) hiyerarsi[g.odemeTuru][g.butceKalemi] = {};
    if (!hiyerarsi[g.odemeTuru][g.butceKalemi][g.hesapAdi])
      hiyerarsi[g.odemeTuru][g.butceKalemi][g.hesapAdi] = Array(gunSayisi).fill(0);
    const gun = Number(g.tarih.split("-")[2]);
    hiyerarsi[g.odemeTuru][g.butceKalemi][g.hesapAdi][gun - 1] += g.tutar;
  });

  // Row structure (Ant Design expandable table uyumlu)
  const rows = [];
  Object.entries(hiyerarsi).forEach(([odemeTuru, kalemler], idx1) => {
    const odemeRow = {
      key: `odeme-${idx1}`,
      type: "odemeTuru",
      ad: odemeTuru,
      children: [],
    };

    Object.entries(kalemler).forEach(([butceKalemi, hesaplar], idx2) => {
      const kalemRow = {
        key: `kalem-${idx1}-${idx2}`,
        type: "butceKalemi",
        ad: butceKalemi,
        children: [],
      };

      // Hesap adlarını ekle
      Object.entries(hesaplar).forEach(([hesapAdi, tutarlar], idx3) => {
        const hesapRow = {
          key: `hesap-${idx1}-${idx2}-${idx3}`,
          type: "hesapAdi",
          ad: hesapAdi,
        };
        for (let i = 1; i <= gunSayisi; i++) {
          hesapRow[`gun${i}`] = tutarlar[i - 1] || 0;
        }
        kalemRow.children.push(hesapRow);
      });

      // Toplam satırı hesapla (her gün için)
      const toplamlar = Array(gunSayisi).fill(0);
      Object.values(hesaplar).forEach((tutarlar) => {
        for (let i = 0; i < gunSayisi; i++) {
          toplamlar[i] += tutarlar[i] || 0;
        }
      });
      const toplamRow = {
        key: `toplam-${idx1}-${idx2}`,
        type: "toplam",
        ad: <span style={{ fontWeight: 600, color: "#D46B08" }}>Toplam</span>,
      };
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

export default function GiderRaporu() {
  const [seciliAy, setSeciliAy] = useState(dayjs("2024-07-01"));
  const gunSayisi = seciliAy.daysInMonth();
  const year = seciliAy.year();
  const month = seciliAy.month() + 1;

  const data = getPivotData(giderler, year, month, gunSayisi);

  const columns = [
    {
      title: "Ad",
      dataIndex: "ad",
      key: "ad",
      width: 220,
      render: (text, record) => {
        if (record.type === "odemeTuru")
          return <b style={{ fontSize: 17, color: "#003a8c" }}>{text}</b>;
        if (record.type === "butceKalemi")
          return <span style={{ paddingLeft: 20, fontWeight: 600, color: "#0958d9" }}>{text}</span>;
        if (record.type === "toplam")
          return <span style={{ paddingLeft: 40, fontWeight: 600, color: "#D46B08" }}>{text}</span>;
        if (record.type === "hesapAdi")
          return <span style={{ paddingLeft: 40, color: "#006" }}>{text}</span>;
        return text;
      },
    },
    ...Array.from({ length: gunSayisi }, (_, i) => ({
      title: i + 1,
      dataIndex: `gun${i + 1}`,
      width: 56,
      align: "right",
      render: (value, record) =>
        record.type === "toplam"
          ? <b style={{ color: "#D46B08" }}>{value > 0 ? value : "-"}</b>
          : value > 0
            ? <b>{value}</b>
            : "-",
    })),
  ];

  // CSS sınıfları
  function rowClassName(record) {
    if (record.type === "odemeTuru") return "grup-odeme";
    if (record.type === "butceKalemi") return "grup-kalem";
    if (record.type === "toplam") return "grup-toplam";
    if (record.type === "hesapAdi") return "grup-hesap";
    return "";
  }

  return (
    <div>
      <h2>Gider Raporu</h2>
      <DatePicker
        picker="month"
        value={seciliAy}
        onChange={setSeciliAy}
        style={{ marginBottom: 16 }}
        allowClear={false}
      />
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
    </div>
  );
}
