import {
  Form,
  Input,
  Button,
  DatePicker,
  InputNumber,
  Select,
  Card,
  message,
  Space,
  Radio,
} from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import { CloseOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { getLocaleConfig } from "../../utils/regionLocaleMap";

const { TextArea } = Input;
const { Option } = Select;
const region = parseInt(localStorage.getItem("region")) || 1;
const { dateFormat, dayjsLocale } = getLocaleConfig(region);
dayjs.locale(dayjsLocale);

export default function GelirEkle() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();
  const [tekrarlimi, setTekrarlimi] = useState("tek");
  const [tekrarSayisi, setTekrarSayisi] = useState(1);

  const duzenlenenGelir = location.state?.gelir;
  const duzenlemeModu = !!duzenlenenGelir;

  useEffect(() => {
    if (duzenlemeModu) {
      setTekrarlimi(duzenlenenGelir.tekrarlimi || "tek");
      setTekrarSayisi(duzenlenenGelir.tekrarSayisi || 1);
    }
  }, [duzenlemeModu, duzenlenenGelir]);

  const onFinish = (values) => {
    const gelirler = JSON.parse(localStorage.getItem("gelirler")) || [];
    const baseKayit = {
      ...values,
      tarih: values.tarih.format("YYYY-MM-DD"), // ✔ backend için saklama formatı
      id: duzenlemeModu ? duzenlenenGelir.id : Date.now(),
      tekrarlimi,
      tekrarSayisi,
    };

    if (duzenlemeModu) {
      const index = gelirler.findIndex(g => g.id === duzenlenenGelir.id);
      if (index !== -1) gelirler[index] = baseKayit;
      message.success("Gelir güncellendi.");
    } else {
      if (tekrarlimi === "tek") {
        gelirler.push(baseKayit);
      } else {
        for (let i = 0; i < tekrarSayisi; i++) {
          const yeniTarih = dayjs(baseKayit.tarih).add(i, 'month').format("YYYY-MM-DD");
          gelirler.push({ ...baseKayit, tarih: yeniTarih, id: Date.now() + i });
        }
      }
      message.success("Gelir(ler) eklendi.");
    }

    localStorage.setItem("gelirler", JSON.stringify(gelirler));
    navigate("/Gelirler/liste");
  };

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={duzenlemeModu ? "Geliri Düzenle" : "Gelir Ekle"}
        bordered
        style={{ maxWidth: 800, margin: "0 auto" }}
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
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 16 }}
          form={form}
          onFinish={onFinish}
          initialValues={{
            ...duzenlenenGelir,
            tarih: duzenlenenGelir ? dayjs(duzenlenenGelir.tarih) : dayjs(),
          }}
        >
          <Form.Item label="Konum" name="konum" rules={[{ required: true }]}>
            <Select placeholder="Konum seçin">
              <Option value="DP Merkez">DP Merkez</Option>
              <Option value="Teknopol">Teknopol</Option>
              <Option value="Antep Teknopark">Antep Teknopark</Option>
              <Option value="Dubai Daplait">Dubai Daplait</Option>
              <Option value="Dubai Proje 2">Dubai Proje 2</Option>
              <Option value="İngiltere">İngiltere</Option>
            </Select>
          </Form.Item>

          <Form.Item label="Gelir Türü" name="gelirTuru" rules={[{ required: true }]}>
            <Select placeholder="Gelir türü seçin">
              <Option value="Hizmet">Hizmet</Option>
              <Option value="Ürün Satışı">Ürün Satışı</Option>
              <Option value="Destek">Destek</Option>
            </Select>
          </Form.Item>

          <Form.Item label="Bütçe Kalemi" name="butceKalemi" rules={[{ required: true }]}>
            <Select placeholder="Bütçe kalemi seçin">
              <Option value="Ar-Ge">Ar-Ge</Option>
              <Option value="Operasyon">Operasyon</Option>
              <Option value="Pazarlama">Pazarlama</Option>
            </Select>
          </Form.Item>

          <Form.Item label="Firma Adı" name="firma" rules={[{ required: true }]}>
            <Select placeholder="Firma seçin">
              <Option value="Daplait">Daplait</Option>
              <Option value="TechWave">TechWave</Option>
              <Option value="InnoSoft">InnoSoft</Option>
            </Select>
          </Form.Item>

          <Form.Item label="Açıklama" name="aciklama">
            <TextArea rows={3} />
          </Form.Item>

          <Form.Item label="Tarih" name="tarih" rules={[{ required: true }]}>
            <DatePicker
              style={{ width: "100%" }}
              format={dateFormat} // ✅ Dinamik tarih formatı
            />
          </Form.Item>

          <Form.Item label="Tutar" name="tutar" rules={[{ required: true }]}>
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              placeholder="₺"
            />
          </Form.Item>

          <Form.Item label="Tahsil Durumu" name="durum" rules={[{ required: true }]}>
            <Select placeholder="Durum seçin">
              <Option value="Tahsil Edildi">Tahsil Edildi</Option>
              <Option value="Kısmen Tahsil Edildi">Kısmen Tahsil Edildi</Option>
              <Option value="Tahsil Edilmedi">Tahsil Edilmedi</Option>
            </Select>
          </Form.Item>

          <Form.Item label="Tekrarlama" colon={false}>
            <Radio.Group
              value={tekrarlimi}
              onChange={(e) => setTekrarlimi(e.target.value)}
            >
              <Radio value="tek">Tek Seferlik</Radio>
              <Radio value="tekrarli">Tekrarlı</Radio>
            </Radio.Group>
          </Form.Item>

          {tekrarlimi === "tekrarli" && (
            <Form.Item label="Tekrar Sayısı">
              <InputNumber
                min={1}
                value={tekrarSayisi}
                onChange={(val) => setTekrarSayisi(val)}
              />
            </Form.Item>
          )}

          <Form.Item wrapperCol={{ offset: 6 }}>
            <Space style={{ width: "100%", justifyContent: "end" }}>
              <Button type="primary" htmlType="submit">
                {duzenlemeModu ? "Güncelle" : "Kaydet"}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
