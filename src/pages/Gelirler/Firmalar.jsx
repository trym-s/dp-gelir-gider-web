import {
  Table, Typography, Button, Input, Select, Row, Col, Space, Popconfirm, message
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const { Title } = Typography;
const { Option } = Select;

export default function Firmalar() {
  const navigate = useNavigate();
  const [firmalar, setfirmalar] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [selectedKonum, setSelectedKonum] = useState(null);
  const [selectedButceKalemi, setSelectedButceKalemi] = useState(null);
  const [selectedRowKey, setSelectedRowKey] = useState(null);

  useEffect(() => {
    const veriler = JSON.parse(localStorage.getItem("firmalar")) || [];
    setfirmalar(veriler);
    setFiltered(veriler);
  }, []);

  useEffect(() => {
    let data = [...firmalar];

    if (selectedKonum) {
      data = data.filter(item => item.konum === selectedKonum);
    }

    if (selectedButceKalemi) {
      data = data.filter(item => item.butceKalemi === selectedButceKalemi);
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
  }, [searchText, selectedKonum, selectedButceKalemi, firmalar]);

  const handleDelete = (id) => {
    const updated = firmalar.filter(item => item.id !== id);
    localStorage.setItem("firmalar", JSON.stringify(updated));
    setfirmalar(updated);
    message.success("firma silindi.");
    setSelectedRowKey(null);
  };

  const handleEdit = (record) => {
    navigate("/Gelirler/firmaEkle", { state: { firma: record } });
  };

  const columns = [
    { title: "Konum", dataIndex: "konum" },
    { title: "Bütçe Kalemi", dataIndex: "butceKalemi" },
    { title: "firma Adı", dataIndex: "firmaAdi" },
    ...(selectedRowKey !== null
      ? [{
          title: "İşlemler",
          key: "actions",
          render: (_, record) =>
            selectedRowKey === record.id ? (
              <Space>
                <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                <Popconfirm
                  title="Bu firmayı silmek istediğinize emin misiniz?"
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

  const konumlar = [...new Set(firmalar.map(item => item.konum))];
  const butceKalemleri = [...new Set(firmalar.map(item => item.butceKalemi))];

  return (
    <div style={{ padding: 24 }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16
      }}>
        <Title level={3} style={{ margin: 0 }}>firmalar</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate("/Gelirler/firmaEkle")}
        >
          Yeni firma
        </Button>
      </div>

      {/* Filtreleme Paneli */}
      <div style={{
        background: "#fafafa", padding: 16, marginBottom: 16,
        borderRadius: 8, border: "1px solid #d9d9d9"
      }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Select
              allowClear
              placeholder="Konum Seçin"
              style={{ width: "100%" }}
              onChange={(value) => setSelectedKonum(value)}
            >
              {konumlar.map((k, i) => (
                <Option key={i} value={k}>{k}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Select
              allowClear
              placeholder="Bütçe Kalemi Seçin"
              style={{ width: "100%" }}
              onChange={(value) => setSelectedButceKalemi(value)}
            >
              {butceKalemleri.map((b, i) => (
                <Option key={i} value={b}>{b}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={24} md={8}>
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
