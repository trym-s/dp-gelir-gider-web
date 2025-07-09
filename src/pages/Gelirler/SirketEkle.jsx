import {
  Form,
  Input,
  Button,
  Select,
  Card,
  message,
  Space,
} from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import { CloseOutlined } from "@ant-design/icons";
import { useEffect } from "react";

const { Option } = Select;

export default function SirketEkle() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();
  const duzenlenenSirket = location.state?.sirket || null;

  useEffect(() => {
    if (duzenlenenSirket) {
      form.setFieldsValue(duzenlenenSirket);
    }
  }, [duzenlenenSirket, form]);

  const onFinish = (values) => {
    const mevcut = JSON.parse(localStorage.getItem("sirketler")) || [];

    if (duzenlenenSirket?.id) {
      const updated = mevcut.map((item) =>
        item.id === duzenlenenSirket.id ? { ...values, id: item.id } : item
      );
      localStorage.setItem("sirketler", JSON.stringify(updated));
      message.success("Şirket bilgisi güncellendi.");
    } else {
      const yeniSirket = {
        ...values,
        id: Date.now(),
      };
      localStorage.setItem("sirketler", JSON.stringify([...mevcut, yeniSirket]));
      message.success("Yeni şirket eklendi.");
    }

    navigate("/Gelirler/sirketler");
  };

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={duzenlenenSirket ? "Şirket Bilgilerini Güncelle" : "Yeni Şirket Ekle"}
        bordered
        style={{ maxWidth: 700, margin: "0 auto" }}
        extra={
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={() => navigate(-1)}
            style={{ fontSize: 16 }}
          />
        }
      >
        <Form
          layout="horizontal"
          labelCol={{ span: 8 }}
          wrapperCol={{ span: 16 }}
          form={form}
          onFinish={onFinish}
        >
          <Form.Item
            label="Konum"
            name="konum"
            rules={[{ required: true, message: "Konum seçiniz" }]}
          >
            <Select placeholder="Konum seçin">
              <Option value="DP Merkez">DP Merkez</Option>
              <Option value="Teknopol">Teknopol</Option>
              <Option value="Antep Teknopark">Antep Teknopark</Option>
              <Option value="Dubai Daplait">Dubai Daplait</Option>
              <Option value="Dubai Proje 2">Dubai Proje 2</Option>
              <Option value="İngiltere">İngiltere</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Bütçe Kalemi"
            name="butceKalemi"
            rules={[{ required: true, message: "Bütçe kalemi seçiniz" }]}
          >
            <Select placeholder="Bütçe kalemi seçin">
              <Option value="Ar-Ge">Ar-Ge</Option>
              <Option value="Operasyon">Operasyon</Option>
              <Option value="Pazarlama">Pazarlama</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Şirket Adı"
            name="sirketAdi"
            rules={[{ required: true, message: "Şirket adı gerekli" }]}
          >
            <Input placeholder="Şirket adını girin" />
          </Form.Item>

          <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
            <Space style={{ width: "100%", justifyContent: "end" }}>
              <Button type="primary" htmlType="submit">
                {duzenlenenSirket ? "Güncelle" : "Kaydet"}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
