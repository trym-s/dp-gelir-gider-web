import { useEffect, useState } from "react";
import { Table, DatePicker, Typography, Row, Button } from "antd";
import { UploadOutlined, DownloadOutlined } from "@ant-design/icons";
import './GelirRaporu.css';
import dayjs from "dayjs";
import "dayjs/locale/tr";
dayjs.locale("tr");
const { Title } = Typography;

export default function GelirRaporu() {
  const [data, setData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(dayjs());

useEffect(() => {
    const fetchData = async () => {
      const year = selectedDate.year();
      const month = (selectedDate.month() + 1).toString().padStart(2, "0");
      const res = await fetch(`/api/incomes/pivot?month=${year}-${month}`);
      const json = await res.json();

      if (!Array.isArray(json)) {
        console.error("Beklenmeyen cevap:", json);
        return;
      }
      console.log("Gelen pivot verisi (JSON):", json);
      const daysInMonth = selectedDate.daysInMonth();

      const grouped = {};

      json.forEach(g => {
        const gun = new Date(g.date).getDate();
        const groupKey = g.budget_item_name; // ✅ doğru alan

        if (!grouped[groupKey]) grouped[groupKey] = [];

        const key = `${g.budget_item_id}__${g.company_id}`;
        let row = grouped[groupKey].find(r => r.key === key);

        if (!row) {
          row = {
            key,
            id: g.company_id,
            company_id: g.company_id,
            budget_id: g.budget_item_id,
            budget_item_name: g.budget_item_name, // ✅ EKLENDİ
            firma: g.company_name,
            description: g.description,
            toplam: 0,
            ...Array.from({ length: daysInMonth }, (_, i) => ({ [i + 1]: 0 }))
              .reduce((acc, cur) => ({ ...acc, ...cur }), {})
          };

          grouped[groupKey].push(row);
        }

        row[gun] += Number(g.amount);
        row.toplam += Number(g.amount);
      });

      const finalData = [];

      Object.entries(grouped).forEach(([kalem, rows], index) => {
        finalData.push({ key: `header-${index}`, isHeader: true, ad: kalem });
        finalData.push(...rows);

        const groupTotal = {
          key: `footer-${index}`,
          isFooter: true,
          ad: "TOPLAM",
          toplam: rows.reduce((sum, r) => sum + r.toplam, 0),
        };

        for (let i = 1; i <= daysInMonth; i++) {
          groupTotal[i] = rows.reduce((sum, r) => sum + (r[i] || 0), 0);
        }

        finalData.push(groupTotal);
      });
      console.log("Pivot final data:", finalData);
      setData(finalData);
    };

    fetchData();
  }, [selectedDate]);


  const daysInMonth = selectedDate.daysInMonth();

  const columns = [
    {
      title: "Bütçe Kalemi",
      dataIndex: "budget_item_name",
      width: 180,
      align: "center",
      render: (_, record) => {
        if (record.isHeader) return record.ad;         // sadece header'da göster
        if (record.isFooter) return "";                // footer’da boş bırak
        return "";                                     // detay satırda tekrar gösterme
      },
    },
    {
      title: "Firma",
      dataIndex: "firma",
      width: 140,
      align: "center",
      render: (_, record) => record.firma || "",
    },
    {
      title: "Açıklama",
      dataIndex: "description",
      width: 200,
      align: "center",
      fixed: 'left',
      render: (_, record) => {
        if (record.isFooter) return <span className="wrap-cell">TOPLAM</span>;
        return <div className="wrap-cell">{record.description || ""}</div>;
      },
    },
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      return {
        title: day.toString(),
        dataIndex: day,
        width: 60,
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
      width: 70,
      align: "center",
      render: (val) => (val ? val.toLocaleString("tr-TR") : ""),
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
    <div style={{ padding: 12 }}> {/* 24 değil, 12 yeterli */}
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
        scroll={{ x: "100%", y: 'calc(100vh - 160px)' }} // daha geniş görünüm
        rowClassName={(record) => {
          if (record.isHeader) return "table-group-header";
          if (record.isFooter) return "table-group-footer";
          return "";
        }}
        rowKey={(_, index) => index}
        bordered
      />
    </div>
  );
}
