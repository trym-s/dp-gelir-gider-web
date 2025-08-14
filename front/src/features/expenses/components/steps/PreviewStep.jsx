// front/src/features/expenses/components/import-wizard/steps/PreviewStep.jsx
import React, { useMemo } from "react";
import { Space, Button, Switch, Input, Table, Tag, Typography, Checkbox } from "antd";
import LineItemsTable from "../components/LineTable";
import { fmtDate, fmtTL } from "../utils";
import "./previewStep.css";
import "../wizard.css";

const { Text: T } = Typography;

const Kpi = ({ label, value }) => (
  <div className="kpi-card">
    <span className="kpi-label">{label}</span>
    <div className="kpi-value">{value}</div>
  </div>
);

export default function PreviewStep(props) {
  const {
    previewId,
    items,
    total,
    loading,
    page,
    size,
    onPageChange,
    onRefresh,
    selectedRowKeys,
    setSelectedRowKeys,
    globalIndexBase,
    search,
    setSearch,
    selectedTotalAmount,
    selectedTotalPaid,
    onBack,
    onNext,
    // opsiyonel: plan toggle artık kullanmıyor olabilirsin; default verelim ki patlamasın
    doPlan = false,
    setDoPlan = () => {},
  } = props;

  const pages = Math.max(1, Math.ceil((total || 0) / (size || 1)));
  const selectedCount = (selectedRowKeys && selectedRowKeys.length) || 0;

  const columns = useMemo(
    () => [
      { title: "Tarih", dataIndex: "date", width: 110, render: fmtDate, className: "mono muted" },
      { title: "Fatura No", dataIndex: "invoice_number", width: 150, className: "mono" },
      {
        title: "Fatura Adı / Satıcı",
        key: "inv_supplier",
        width: 360,
        render: (_, r) => (
          <div className="twolines">
            <div className="primary">{r.invoice_name || <i>(boş)</i>}</div>
            <div className="secondary">{r.supplier || "—"}</div>
          </div>
        ),
      },
      { title: "Toplam (KDV dahil)", dataIndex: "amount", width: 160, align: "right", render: fmtTL, className: "mono" },
      {
        title: "Ödenen / Son Ödeme",
        key: "paid_last",
        width: 220,
        render: (_, r) => (
          <div className="rightcol">
            <div className="mono">{fmtTL(r.total_paid)}</div>
            <div className="secondary">{fmtDate(r.last_payment_date)}</div>
          </div>
        ),
      },
      {
        title: "Hesap",
        dataIndex: "account_name",
        width: 160,
        render: (v) => (v ? v : <Tag color="warning">Eşleşmedi</Tag>),
      },
    ],
    []
  );

  // eşleşmeyen hesap varsa satırı hafif sarıya boya
  const rowClassName = (record) => (!record?.account_name ? "row-unmatched" : "");

  return (
    <div className="import-preview">
      <div className="kpi-grid">
        <Kpi label="Seçili Fatura" value={selectedCount.toLocaleString("tr-TR")} />
        <Kpi
          label="Toplam Tutar (seçili)"
          value={`${Number(selectedTotalAmount || 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺`}
        />
        <Kpi
          label="Toplam Ödenen (seçili)"
          value={`${Number(selectedTotalPaid || 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺`}
        />
        <Kpi label="Sayfa / Toplam" value={`${page} / ${pages}`} />
      </div>

      {/* toolbar */}
      <div className="toolbar">
        <div style={{ borderRight: "1px solid #ddd", paddingRight: 12, marginRight: 12 }}>
          <Checkbox
            checked={selectedCount === total}
            indeterminate={selectedCount > 0 && selectedCount < total}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedRowKeys(Array.from({ length: total }, (_, i) => i));
              } else {
                setSelectedRowKeys([]);
              }
            }}
          >
            Hepsini seç
          </Checkbox>
        </div>
        <div className="toolbar-right">
          <Input
            allowClear
            placeholder="Fatura no / ad / satıcı ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search"
          />
          <Button onClick={onRefresh} loading={loading}>
            Yenile
          </Button>
          <div className="toggle">
            <Switch checked={doPlan} onChange={setDoPlan} /> <T>Plan adımını göster</T>
          </div>
          <T type="secondary" className="preview-id">
            {previewId ? `Preview ID: ${previewId}` : ""}
          </T>
        </div>
      </div>

      {/* table */}
      <Table
        size="small"
        rowKey={(_, idx) => globalIndexBase + idx}
        columns={columns}
        dataSource={items}
        loading={loading}
        rowClassName={rowClassName}
        sticky
        scroll={{ y: "60vh" }}
        expandable={{
          expandedRowRender: (record) => (
            <div className="lines-wrapper">
              <LineItemsTable lines={record.lines} />
            </div>
          ),
          rowExpandable: (record) => Array.isArray(record.lines) && record.lines.length > 0,
        }}
        pagination={{
          current: page,
          pageSize: size,
          total,
          showSizeChanger: true,
          showTotal: (t) => `Toplam ${t} kayıt`,
          onChange: onPageChange,
        }}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
          preserveSelectedRowKeys: true,
          selections: [Table.SELECTION_ALL, Table.SELECTION_INVERT, Table.SELECTION_NONE],
        }}
      />

      {/* footer bar */}
      <div className="footerbar">
        <T type="secondary">
          Seçili: <b>{selectedCount}</b> · Toplam: <b className="mono">{fmtTL(selectedTotalAmount)}</b> · Ödenen:{" "}
          <b className="mono">{fmtTL(selectedTotalPaid)}</b>
        </T>
        <div className="footer-actions">
          <Button onClick={onBack}>Geri</Button>
          <Button type="primary" onClick={onNext} disabled={selectedCount === 0}>
            Devam
          </Button>
        </div>
      </div>
    </div>
  );
}

