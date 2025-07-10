import React, { useEffect, useState } from "react";
import { Table, Button, message } from "antd";
import axios from "axios";

const columns = [
  { title: "Gider Türü", dataIndex: "giderTuru", key: "giderTuru" },
  { title: "Bütçe Kalemi", dataIndex: "butceKalemi", key: "butceKalemi" },
  { title: "Hesap Adı", dataIndex: "hesapAdi", key: "hesapAdi" },
  { title: "Tutar", dataIndex: "tutar", key: "tutar", render: (text) => text + " ₺" },
  { title: "Tarih", dataIndex: "tarih", key: "tarih" },
  { title: "Açıklama", dataIndex: "aciklama", key: "aciklama" },
  { title: "Yer", dataIndex: "yer", key: "yer" }
  // Sil/Düzenle butonları istersen buralara eklenir
];

export default function GiderListesi() {
  const [giderler, setGiderler] = useState([]);
  const [loading, setLoading] = useState(false);

  // Giderleri API'den çek
  const fetchGiderler = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:5000/api/giderler");
      setGiderler(res.data);
    } catch (err) {
      message.error("Giderler alınamadı!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGiderler();
  }, []);

  return (
    <div>
      <h2>Gider Listesi</h2>
      <Button onClick={fetchGiderler} style={{ marginBottom: 16 }}>
        Yenile
      </Button>
      <Table
        columns={columns}
        dataSource={giderler}
        loading={loading}
        rowKey="_id" // Eğer mongo ya da farklı bir id alanı varsa onu kullan
        pagination={{ pageSize: 10 }}
      />
    </div>
  );
}
