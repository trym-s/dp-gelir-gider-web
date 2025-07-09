import {
  Table, Typography, Button, Input, DatePicker, Select, Row, Col, Space, Popconfirm, message
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import dayjs from "dayjs";

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

export default function GelirListesi() {
  const navigate = useNavigate();
  const [gelirler, setGelirler] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedGelirTuru, setSelectedGelirTuru] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [selectedRowKey, setSelectedRowKey] = useState(null);

  useEffect(() => {
    const veriler = JSON.parse(localStorage.getItem("gelirler")) || [];
    setGelirler(veriler);
    setFiltered(veriler);
  }, []);

  useEffect(() => {
    let data = [...gelirler];

    if (dateRange) {
      data = data.filter(item => {
        const tarih = dayjs(item.tarih);
        return tarih.isAfter(dateRange[0]) && tarih.isBefore(dateRange[1]);
      });
    }

    if (selectedCompany) {
      data = data.filter(item => item.sirket === selectedCompany);
    }

    if (selectedGelirTuru) {
      data = data.filter(item => item.gelirTuru === selectedGelirTuru);
    }

    if (searchText) {
      const lower = searchText.toLowerCase();
      data = data.filter(item =>
        Object.values(item).some(val =>
          String(val).toLowerCase().includes(lower)
        )
      );
    }

    setFiltered(data);
  }, [searchText, selectedCompany, selectedGelirTuru, dateRange, gelirler]);

  const handleDelete = (id) => {
    const updated = gelirler.filter(item => item.id !== id);
    localStorage.setItem("gelirler", JSON.stringify(updated));
    setGelirler(updated);
    message.success("Kayıt silindi.");
    setSelectedRowKey(null);
  };

  const handleEdit = (record) => {
    navigate("/Gelirler/ekle", { state: { gelir: record } });
  };

  const columns = [
    { title: "Konum", dataIndex: "konum" },
    { title: "Gelir Türü", dataIndex: "gelirTuru" },
    { title: "Bütçe Kalemi", dataIndex: "butceKalemi" },
    { title: "Şirket", dataIndex: "sirket" },
    { title: "Tarih", dataIndex: "tarih" },
    { title: "Tutar", dataIndex: "tutar" },
    { title: "Durum", dataIndex: "durum" },
    { title: "Açıklama", dataIndex: "aciklama" },
    ...(selectedRowKey !== null
      ? [{
          title: "İşlemler",
          key: "actions",
          render: (_, record) =>
            selectedRowKey === record.id ? (
              <Space>
                <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                <Popconfirm
                  title="Bu geliri silmek istediğinize emin misiniz?"
                  onConfirm={() => handleDelete(record.id)}
                  okText="Evet"
                  cancelText="Hayır"
                >
                  <Button icon={<DeleteOutlined />} danger />
                </Popconfirm>
              </Space>
            ) : null,
        }]
      : [])
  ];

  const sirketler = [...new Set(gelirler.map(item => item.sirket))];
  const gelirTurleri = [...new Set(gelirler.map(item => item.gelirTuru))];

  return (
    <div style={{ padding: 24 }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16
      }}>
        <Title level={3} style={{ margin: 0 }}>Gelir Listesi</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate("/Gelirler/ekle")}
        >
          Yeni Gelir
        </Button>
      </div>

      {/* Filtreleme Paneli */}
      <div style={{
        background: "#fafafa", padding: 16, marginBottom: 16,
        borderRadius: 8, border: "1px solid #d9d9d9"
      }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <RangePicker
              style={{ width: "100%" }}
              onChange={(dates) => setDateRange(dates)}
              format="YYYY-MM-DD"
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              allowClear
              placeholder="Şirket Seçin"
              style={{ width: "100%" }}
              onChange={(value) => setSelectedCompany(value)}
            >
              {sirketler.map((s, i) => (
                <Option key={i} value={s}>{s}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              allowClear
              placeholder="Gelir Türü Seçin"
              style={{ width: "100%" }}
              onChange={(value) => setSelectedGelirTuru(value)}
            >
              {gelirTurleri.map((g, i) => (
                <Option key={i} value={g}>{g}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Input.Search
              placeholder="🔍 Arama yapın..."
              allowClear
              onSearch={(val) => setSearchText(val)}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </Col>
        </Row>
      </div>

      <Table
        columns={columns}
        dataSource={filtered.map((item) => ({ key: item.id, ...item }))}
        onRow={(record) => ({
          onClick: () =>
            setSelectedRowKey(record.id === selectedRowKey ? null : record.id),
          style: {
            backgroundColor:
              record.id === selectedRowKey ? "#e6f7ff" : "transparent",
            cursor: "pointer",
          },
        })}
      />
    </div>
  );
}
