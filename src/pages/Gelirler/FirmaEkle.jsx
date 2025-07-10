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

export default function FirmaEkle() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();
  const duzenlenenfirma = location.state?.firma || null;

  useEffect(() => {
    if (duzenlenenfirma) {
      form.setFieldsValue(duzenlenenfirma);
    }
  }, [duzenlenenfirma, form]);

  const onFinish = (values) => {
    const mevcut = JSON.parse(localStorage.getItem("firmalar")) || [];

    if (duzenlenenfirma?.id) {
      const updated = mevcut.map((item) =>
        item.id === duzenlenenfirma.id ? { ...values, id: item.id } : item
      );
      localStorage.setItem("firmalar", JSON.stringify(updated));
      message.success("firma bilgisi güncellendi.");
    } else {
      const yenifirma = {
        ...values,
        id: Date.now(),
      };
      localStorage.setItem("firmalar", JSON.stringify([...mevcut, yenifirma]));
      message.success("Yeni firma eklendi.");
    }

    navigate("/Gelirler/firmalar");
  };

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={duzenlenenfirma ? "firma Bilgilerini Güncelle" : "Yeni firma Ekle"}
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
            label="firma Adı"
            name="firmaAdi"
            rules={[{ required: true, message: "firma adı gerekli" }]}
          >
            <Input placeholder="firma adını girin" />
          </Form.Item>

          <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
            <Space style={{ width: "100%", justifyContent: "end" }}>
              <Button type="primary" htmlType="submit">
                {duzenlenenfirma ? "Güncelle" : "Kaydet"}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
