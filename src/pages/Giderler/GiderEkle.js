import React, { useState } from "react";
import {
  Form,
  Input,
  Button,
  Select,
  DatePicker,
  Row,
  Col,
  Space,
  Modal,
  message,
  Table,
  Popconfirm,
} from "antd";
import dayjs from "dayjs";

const { Option } = Select;

export default function GiderEkle() {
  // Dropdown state'leri
  const [giderTurleri, setGiderTurleri] = useState([
    { value: "fatura", label: "Fatura" },
    { value: "market", label: "Market" },
    { value: "ulasim", label: "Ulaşım" },
  ]);
  const [butceKalemleri, setButceKalemleri] = useState([
    { value: "genel", label: "Genel" },
    { value: "egitim", label: "Eğitim" },
    { value: "saglik", label: "Sağlık" },
  ]);
  const [hesapAdlari, setHesapAdlari] = useState([
    { value: "banka", label: "Banka" },
    { value: "nakit", label: "Nakit" },
  ]);

  // Modal yönetimi
  const [modalOpen, setModalOpen] = useState(false);
  const [editingType, setEditingType] = useState(null); // "giderTuru", "butceKalemi", "hesapAdi"
  const [editingValue, setEditingValue] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [yapiForm] = Form.useForm();

  // Ana form
  const [form] = Form.useForm();

  // Tekrarlı gider state
  const [tekrarliModu, setTekrarliModu] = useState(false);
  const [tekrarSayisi, setTekrarSayisi] = useState(2);

  // Gider ekleme işlemi
  const handleFinish = (values) => {
    if (tekrarliModu) {
      // Tekrarlı ekleme (şu an sadece console.log)
      let giderList = [];
      for (let i = 0; i < tekrarSayisi; i++) {
        giderList.push({
          ...values,
          tarih: dayjs(values.tarih).add(i, "month").format("YYYY-MM-DD"),
        });
      }
      console.log("Tekrarlı giderler:", giderList);
      message.success(
        `${tekrarSayisi} ay için giderler hazırlandı (Backend entegrasyonunda kaydedilecek)`
      );
    } else {
      message.success(
        "Gider kaydedildi (Backend bağlantısı yapılınca kalıcı olacak)"
      );
    }
    setTekrarliModu(false);
    setTekrarSayisi(2);
    form.resetFields();
  };

  // Yapı ekle modal submit
  const handleYapiEkle = (values) => {
    if (
      !values.giderTuru ||
      !values.butceKalemi ||
      !values.hesapAdi ||
      giderTurleri.some((g) => g.value === values.giderTuru) ||
      butceKalemleri.some((b) => b.value === values.butceKalemi) ||
      hesapAdlari.some((h) => h.value === values.hesapAdi)
    ) {
      message.warning("Aynı isimde bir kayıt mevcut ya da alanlar boş!");
      return;
    }
    setGiderTurleri((prev) => [
      ...prev,
      { value: values.giderTuru, label: values.giderTuru },
    ]);
    setButceKalemleri((prev) => [
      ...prev,
      { value: values.butceKalemi, label: values.butceKalemi },
    ]);
    setHesapAdlari((prev) => [
      ...prev,
      { value: values.hesapAdi, label: values.hesapAdi },
    ]);
    message.success("Yeni yapı eklendi!");
    yapiForm.resetFields();
  };

  // DÜZENLEME BAŞLAT
  const handleEdit = (type, index, oldValue) => {
    setEditingType(type);
    setEditingIndex(index);
    setEditingValue(oldValue);
  };

  // DÜZENLEMEYİ KAYDET
  const handleSaveEdit = () => {
    if (!editingValue.trim()) {
      message.error("Alan boş bırakılamaz!");
      return;
    }
    if (editingType === "giderTuru") {
      setGiderTurleri((prev) =>
        prev.map((item, idx) =>
          idx === editingIndex
            ? { value: editingValue, label: editingValue }
            : item
        )
      );
    } else if (editingType === "butceKalemi") {
      setButceKalemleri((prev) =>
        prev.map((item, idx) =>
          idx === editingIndex
            ? { value: editingValue, label: editingValue }
            : item
        )
      );
    } else if (editingType === "hesapAdi") {
      setHesapAdlari((prev) =>
        prev.map((item, idx) =>
          idx === editingIndex
            ? { value: editingValue, label: editingValue }
            : item
        )
      );
    }
    setEditingType(null);
    setEditingValue("");
    setEditingIndex(null);
    message.success("Düzenleme kaydedildi!");
  };

  // SİLME
  const handleDelete = (type, index) => {
    if (type === "giderTuru") {
      setGiderTurleri((prev) => prev.filter((_, idx) => idx !== index));
    } else if (type === "butceKalemi") {
      setButceKalemleri((prev) => prev.filter((_, idx) => idx !== index));
    } else if (type === "hesapAdi") {
      setHesapAdlari((prev) => prev.filter((_, idx) => idx !== index));
    }
    message.success("Silindi.");
  };

  // Tablo için yardımcı fonksiyon (düzenleme ve silme ile)
  const getTableColumns = (type) => [
    {
      title: "Ad",
      dataIndex: "label",
      key: "label",
      render: (text, record, idx) =>
        editingType === type && editingIndex === idx ? (
          <Input
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            style={{ width: 140, marginRight: 8 }}
            onPressEnter={handleSaveEdit}
            autoFocus
          />
        ) : (
          text
        ),
    },
    {
      title: "İşlem",
      key: "actions",
      render: (_, __, idx) =>
        editingType === type && editingIndex === idx ? (
          <Button type="link" size="small" onClick={handleSaveEdit}>
            Kaydet
          </Button>
        ) : (
          <Space>
            <Button
              type="link"
              size="small"
              onClick={() =>
                handleEdit(
                  type,
                  idx,
                  type === "giderTuru"
                    ? giderTurleri[idx].label
                    : type === "butceKalemi"
                    ? butceKalemleri[idx].label
                    : hesapAdlari[idx].label
                )
              }
            >
              Düzenle
            </Button>
            <Popconfirm
              title="Silmek istediğinize emin misiniz?"
              onConfirm={() => handleDelete(type, idx)}
              okText="Evet"
              cancelText="Hayır"
            >
              <Button type="link" danger size="small">
                Sil
              </Button>
            </Popconfirm>
          </Space>
        ),
    },
  ];

  return (
    <Row justify="center">
      <Col xs={24} sm={18} md={14} lg={10}>
        <h2 style={{ textAlign: "center" }}>Gider Ekle</h2>
        <Form layout="vertical" form={form} onFinish={handleFinish}>
          <Form.Item
            label="Gider Türü"
            name="giderTuru"
            rules={[{ required: true, message: "Lütfen gider türü seçin!" }]}
          >
            <Select placeholder="Gider türü seçin">
              {giderTurleri.map((item) => (
                <Option key={item.value} value={item.value}>
                  {item.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Bütçe Kalemi"
            name="butceKalemi"
            rules={[{ required: true, message: "Lütfen bütçe kalemi seçin!" }]}
          >
            <Select placeholder="Bütçe kalemi seçin">
              {butceKalemleri.map((item) => (
                <Option key={item.value} value={item.value}>
                  {item.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Hesap Adı"
            name="hesapAdi"
            rules={[{ required: true, message: "Lütfen hesap adı seçin!" }]}
          >
            <Select placeholder="Hesap adı seçin">
              {hesapAdlari.map((item) => (
                <Option key={item.value} value={item.value}>
                  {item.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Tutar"
            name="tutar"
            rules={[{ required: true, message: "Lütfen tutar girin!" }]}
          >
            <Input type="number" min={0} placeholder="Tutar girin" />
          </Form.Item>

          <Form.Item
            label="Tarih"
            name="tarih"
            rules={[{ required: true, message: "Lütfen tarih seçin!" }]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item label="Açıklama" name="aciklama">
            <Input.TextArea placeholder="Açıklama girin" />
          </Form.Item>

          <Form.Item label="Yer" name="yer">
            <Input placeholder="Yer bilgisi girin" />
          </Form.Item>

          {tekrarliModu && (
            <Form.Item label="Kaç ay tekrarlansın?" style={{ marginBottom: 0 }}>
              <Select
                value={tekrarSayisi}
                style={{ width: 200 }}
                onChange={setTekrarSayisi}
              >
                {[...Array(12)].map((_, i) => (
                  <Option value={i + 1} key={i + 1}>
                    {i + 1} ay
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Space
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 24,
            }}
          >
            <Button type="primary" htmlType="submit">
              Kaydet
            </Button>
            <Button
              type={tekrarliModu ? "primary" : "dashed"}
              onClick={() => setTekrarliModu(!tekrarliModu)}
            >
              Tekrarlı Gider Ekle
            </Button>
            <Button type="dashed" onClick={() => setModalOpen(true)}>
              Yapı Ekle
            </Button>
          </Space>
        </Form>

        {/* Modal - Yapı Ekle */}
        <Modal
          title="Yapı Ekle"
          open={modalOpen}
          onCancel={() => {
            setModalOpen(false);
            setEditingType(null);
            setEditingIndex(null);
            setEditingValue("");
          }}
          footer={null}
        >
          {/* Yeni yapı ekleme formu */}
          <Form layout="vertical" form={yapiForm} onFinish={handleYapiEkle}>
            <Form.Item
              label="Ödeme Türü"
              name="giderTuru"
              rules={[{ required: true, message: "Lütfen yeni ödeme türü girin!" }]}
            >
              <Input placeholder="Yeni ödeme türü gir" />
            </Form.Item>
            <Form.Item
              label="Bütçe Kalemi"
              name="butceKalemi"
              rules={[{ required: true, message: "Lütfen yeni bütçe kalemi girin!" }]}
            >
              <Input placeholder="Yeni bütçe kalemi gir" />
            </Form.Item>
            <Form.Item
              label="Hesap Adı"
              name="hesapAdi"
              rules={[{ required: true, message: "Lütfen yeni hesap adı girin!" }]}
            >
              <Input placeholder="Yeni hesap adı gir" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block>
                Ekle
              </Button>
            </Form.Item>
          </Form>

          <h4>Ekli Ödeme Türleri</h4>
          <Table
            dataSource={giderTurleri}
            columns={getTableColumns("giderTuru")}
            rowKey="value"
            size="small"
            pagination={false}
          />
          <h4 style={{ marginTop: 20 }}>Ekli Bütçe Kalemleri</h4>
          <Table
            dataSource={butceKalemleri}
            columns={getTableColumns("butceKalemi")}
            rowKey="value"
            size="small"
            pagination={false}
          />
          <h4 style={{ marginTop: 20 }}>Ekli Hesap Adları</h4>
          <Table
            dataSource={hesapAdlari}
            columns={getTableColumns("hesapAdi")}
            rowKey="value"
            size="small"
            pagination={false}
          />
        </Modal>
      </Col>
    </Row>
  );
}
