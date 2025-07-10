import { useEffect, useState } from "react";
import { Table, DatePicker, Typography, Row, Button } from "antd";
import { UploadOutlined, DownloadOutlined } from "@ant-design/icons";
import '../../styles/GelirRaporu.css';
import dayjs from "dayjs";
import "dayjs/locale/tr";
dayjs.locale("tr");
const { Title } = Typography;

export default function GelirRaporu() {
  const [data, setData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(dayjs());

  useEffect(() => {
    const gelirler = JSON.parse(localStorage.getItem("gelirler")) || [];
    const year = selectedDate.year();
    const month = selectedDate.month();
    const daysInMonth = selectedDate.daysInMonth();

    const grouped = {};

    gelirler.forEach((g) => {
      const t = dayjs(g.tarih);
      if (t.year() !== year || t.month() !== month) return;

      const gun = t.date();
      if (!grouped[g.butceKalemi]) grouped[g.butceKalemi] = [];

      const key = `${g.butceKalemi}__${g.firma}`;
      let row = grouped[g.butceKalemi].find(r => r.firma === g.firma);

      if (!row) {
        row = {
          key,
          firma: g.firma,
          ad: g.firma,  // Görüntülenen isim artık firma ismi
          toplam: 0,
          ...Array.from({ length: daysInMonth }, (_, i) => ({ [i + 1]: 0 }))
            .reduce((acc, cur) => ({ ...acc, ...cur }), {}),
        };
        grouped[g.butceKalemi].push(row);
      }

      row[gun] += Number(g.tutar);
      row.toplam += Number(g.tutar);
    });

    const finalData = [];

    Object.entries(grouped).forEach(([kalem, rows], index) => {
      // Grup başlığı
      finalData.push({
        key: `header-${index}`,
        isHeader: true,
        ad: kalem,
      });

      finalData.push(...rows);

      // Grup alt toplam satırı
      const groupTotalRow = {
        key: `footer-${index}`,
        isFooter: true,
        ad: "TOPLAM",
        toplam: rows.reduce((sum, r) => sum + r.toplam, 0),
      };

      for (let i = 1; i <= daysInMonth; i++) {
        groupTotalRow[i] = rows.reduce((sum, r) => sum + (r[i] || 0), 0);
      }

      finalData.push(groupTotalRow);
    });

    setData(finalData);
  }, [selectedDate]);

  const daysInMonth = selectedDate.daysInMonth();

  const columns = [
    {
      title: "Ad",
      dataIndex: "ad",
      fixed: "left",
      width: 220,
      render: (_, record) => {
        if (record.isHeader) {
          return <span style={{ fontWeight: "bold", color: "#0958d9" }}>{record.ad}</span>;
        }
        if (record.isFooter) {
          return <span style={{ fontWeight: "bold", color: "#d48806" }}>Toplam</span>;
        }
        return record.ad;
      },
    },
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      return {
        title: day.toString(),
        dataIndex: day,
        width: 40,
        align: "center",
        render: (val, record) => {
          if (record.isHeader) return "";
          return val > 0 ? val.toLocaleString("tr-TR") : "-";
        },
      };
    }),
    {
      title: "Toplam",
      dataIndex: "toplam",
      width: 80,
      align: "center",
      render: (val) => (val ? val.toLocaleString("tr-TR") : "-"),
      onCell: (record) => {
        if (record.isFooter) {
          return {
            className: "toplam-footer-cell", // ✅ TD hücresine uygulanır
          };
        }
        return {}; // diğerlerine sınıf verilmez
      },
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Gelir Raporu</Title>
      </Row>

      <Row justify="end" align="middle" gutter={12} style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<DownloadOutlined />}>İçe Aktar</Button>
        <Button type="primary" icon={<UploadOutlined />} style={{ marginLeft: 8 }} >Dışa Aktar</Button>
        <DatePicker
          picker="month"
          value={selectedDate}
          onChange={(val) => setSelectedDate(val)} style={{ marginLeft: 12 }}
        />
      </Row>

      <Table
        columns={columns}
        dataSource={data}
        pagination={false}
        scroll={{ x: "max-content", y: 'calc(100vh - 240px)' }}
        rowClassName={(record) => {
          if (record.isHeader) return "table-group-header";
          if (record.isFooter) return "table-group-footer";
          return "";
        }}
        rowKey="key"
        bordered
      />
    </div>
  );
}
