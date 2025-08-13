// front/src/features/expenses/components/import-wizard/components/LineItemsTable.jsx
import React from "react";
import { Table } from "antd";
import { fmtTL } from "../utils";

const columns = [
  { title: "Açıklama", dataIndex: "description", key: "description", width: 240, ellipsis: true },
  { title: "Adet", dataIndex: "quantity", key: "quantity", width: 80, align: "right" },
  { title: "Birim Fiyat", dataIndex: "unit_price", key: "unit_price", width: 120, align: "right", render: fmtTL },
  { title: "KDV", dataIndex: "kdv_amount", key: "kdv_amount", width: 110, align: "right", render: fmtTL },
  { title: "Toplam (KDV dahil)", dataIndex: "net_amount", key: "net_amount", width: 150, align: "right", render: fmtTL },
];

export default function LineItemsTable({ lines }) {
  return (
    <Table
      size="small"
      rowKey={(_, i) => `line-${i}`}
      columns={columns}
      dataSource={lines || []}
      pagination={false}
    />
  );
}
