import { useState } from "react";
import { Table, DatePicker, Typography, Row, Button, Spin, Alert } from "antd";
import { UploadOutlined, DownloadOutlined } from "@ant-design/icons";
import './GelirRaporu.css';
import dayjs from "dayjs";
import "dayjs/locale/tr";
import { useIncomePivot } from "../../hooks/useIncomePivot";

dayjs.locale("tr");
const { Title } = Typography;

export default function GelirRaporu() {
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const { data, isLoading, error } = useIncomePivot(selectedDate);

  const daysInMonth = selectedDate.daysInMonth();

  const columns = [
    {
      title: "Bütçe Kalemi",
      dataIndex: "budget_item_name",
      width: 180,
      align: "center",
      render: (_, record) => {
        if (record.isHeader) return <strong>{record.ad}</strong>;
        return "";
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
        if (record.isFooter) return <span className="wrap-cell"><strong>TOPLAM</strong></span>;
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
      render: (val) => (val ? <strong>{val.toLocaleString("tr-TR")}</strong> : ""),
      onCell: (record) => ({
        className: record.isFooter ? "toplam-footer-cell" : "",
      }),
    },
  ];

  return (
    <div className="gelir-raporu-container" style={{ padding: 12 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Gelir Raporu</Title>
        <DatePicker
          picker="month"
          value={selectedDate}
          onChange={(val) => setSelectedDate(val)}
          style={{ marginLeft: 12 }}
          allowClear={false}
        />
      </Row>

      {error && (
        <Alert
          message="Hata"
          description="Veriler yüklenirken bir sorun oluştu. Lütfen daha sonra tekrar deneyin."
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Spin spinning={isLoading} tip="Yükleniyor..." size="large">
        <Table
          columns={columns}
          dataSource={data}
          pagination={false}
          scroll={{ x: "100%", y: 'calc(100vh - 200px)' }}
          rowClassName={(record) => {
            if (record.isHeader) return "table-group-header";
            if (record.isFooter) return "table-group-footer";
            return "";
          }}
          rowKey={(record) => record.key}
          bordered
        />
      </Spin>
    </div>
  );
}