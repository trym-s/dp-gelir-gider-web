
import React, { useEffect, useMemo, useState } from "react";
import { Table, Space, Button, Select, Tag, Typography, message, Switch } from "antd";
import { accountNameService } from "../../../../api/accountNameService";
import { supplierService } from "../../../../api/supplierService";
import "../wizard.css";

const { Text } = Typography;

// basit TR normalize — backend'deki norm_text'e yakın
function norm(s) {
  return (s || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/İ/g, "i")
    .replace(/I/g, "ı")
    .replace(/Ğ/g, "ğ")
    .replace(/Ü/g, "ü")
    .replace(/Ş/g, "ş")
    .replace(/Ö/g, "ö")
    .replace(/Ç/g, "ç");
}

const Kpi = ({ label, value }) => (
  <div className="kpi-card">
    <span className="kpi-label">{label}</span>
    <div className="kpi-value">{value}</div>
  </div>
);

export default function ResolveStep({
  defaultPtid,                 // number | null
  selectedRows = [],           // [{ invoice_number, supplier, account_name, ...}]
  commitLoading,
  lastCommitErrors = [],
  onBack,
  onCommitWithOverrides,       // (overrides: {invoice_number, account_id?, supplier_id?}[]) => void
}) {
  const ptid = defaultPtid ?? null;

  // --- tüm hesap ve tedarikçileri yükle
  const [allAccounts, setAllAccounts] = useState([]);
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [loadingLists, setLoadingLists] = useState(false);

  useEffect(() => {
    let mounted = true;
    const normList = (res) => (Array.isArray(res) ? res : res?.items || res?.data || []);
    (async () => {
      try {
        setLoadingLists(true);
        const [accRes, supRes] = await Promise.all([
          accountNameService.getAll(),
          supplierService.getAll(),
        ]);
        if (!mounted) return;
        const acc = normList(accRes).map((a) => ({
          id: a.id,
          name: a.name || "",
          payment_type_id: a.payment_type_id ?? null,
        }));
        const sup = normList(supRes).map((s) => ({ id: s.id, name: s.name || "" }));
        setAllAccounts(acc);
        setAllSuppliers(sup);
      } catch (e) {
        message.error("Liste yüklenemedi");
      } finally {
        setLoadingLists(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // --- dropdown opsiyonları (manuel override isterse)
  const accountOptions = useMemo(() => {
    const src = Array.isArray(allAccounts) ? allAccounts : [];
    const filtered = ptid ? src.filter((a) => Number(a.payment_type_id) === Number(ptid)) : src;
    return filtered
      .sort((a, b) => (a.name || "").localeCompare(b.name || "", "tr"))
      .map((a) => ({ value: a.id, label: a.name }));
  }, [allAccounts, ptid]);

  const supplierOptions = useMemo(() => {
    const src = Array.isArray(allSuppliers) ? allSuppliers : [];
    return src
      .sort((a, b) => (a.name || "").localeCompare(b.name || "", "tr"))
      .map((s) => ({ value: s.id, label: s.name }));
  }, [allSuppliers]);

  // --- manuel override state (opsiyonel)
  const [rowOverrides, setRowOverrides] = useState({});
  useEffect(() => {
    const init = {};
    for (const r of selectedRows) {
      const inv = (r.invoice_number || "").trim();
      if (inv) init[inv] = {}; // boş override ile hazır
    }
    setRowOverrides(init);
  }, [selectedRows]);

  const setOverride = (inv, patch) => {
    setRowOverrides((prev) => ({ ...prev, [inv]: { ...(prev[inv] || {}), ...patch } }));
  };

  // --- hata görünümü
  const errorMap = useMemo(() => {
    const m = new Map();
    (lastCommitErrors || []).forEach((e) => {
      if (e?.invoice_number) m.set(e.invoice_number, true);
    });
    return m;
  }, [lastCommitErrors]);

  const [onlyErrors, setOnlyErrors] = useState(false);
  const rowsToShow = useMemo(() => {
    const base = Array.isArray(selectedRows) ? selectedRows : [];
    return onlyErrors ? base.filter((r) => errorMap.get(r.invoice_number)) : base;
  }, [selectedRows, onlyErrors, errorMap]);

  // --- otomatik çözümleyip commit eden ana işlev
  const [autoResolving, setAutoResolving] = useState(false);

  const handleAutoResolveAndCommit = async () => {
    // 1) var olan listelerden hızlı lookup map'leri
    const accByName = new Map();
    const supByName = new Map();
    for (const a of allAccounts) {
      if (ptid && Number(a.payment_type_id) !== Number(ptid)) continue;
      accByName.set(norm(a.name), a.id);
    }
    for (const s of allSuppliers) {
      supByName.set(norm(s.name), s.id);
    }

    // 2) aynı isim için yalnızca bir kez create etmek üzere cache
    const newlyCreatedAcc = new Map(); // normName -> id
    const newlyCreatedSup = new Map();

    const overridesOut = [];

    setAutoResolving(true);
    try {
      // 3) satırları gez: manuel override varsa onu kullan; yoksa isimden çöz / yoksa yarat
      for (const r of selectedRows) {
        const inv = (r.invoice_number || "").trim();
        if (!inv) continue;

        const manual = rowOverrides[inv] || {};
        const next = { ...manual };

        // account_name
        if (!next.account_id) {
          const aname = (r.account_name || "").trim();
          if (aname) {
            const key = norm(aname);
            let id = accByName.get(key) || newlyCreatedAcc.get(key);
            if (!id && ptid) {
              // yarat ve haritalara işle (aynı ada ikinci kez istek atma)
              try {
                const created = await accountNameService.create({ name: aname, payment_type_id: ptid });
                id = created?.id;
                if (id) {
                  newlyCreatedAcc.set(key, id);
                  accByName.set(key, id);
                }
              } catch (e) {
                // sorun olursa backend yine de isimden yaratmayı deneyebilir; burada zorlamıyoruz
                // sadece kullanıcıya heads-up
                // console.warn("account create failed:", aname, e);
              }
            }
            if (id) next.account_id = id;
          }
        }

        // supplier
        if (!next.supplier_id) {
          const sname = (r.supplier || "").trim();
          if (sname) {
            const key = norm(sname);
            let id = supByName.get(key) || newlyCreatedSup.get(key);
            if (!id) {
              try {
                const created = await supplierService.create({ name: sname });
                id = created?.id;
                if (id) {
                  newlyCreatedSup.set(key, id);
                  supByName.set(key, id);
                }
              } catch (e) {
                // aynı şekilde sessiz geç; backend isimden create edebilir
                // console.warn("supplier create failed:", sname, e);
              }
            }
            if (id) next.supplier_id = id;
          }
        }

        // en az bir id varsa override gönder; yoksa boş gönderme — backend isim stringinden kendi çözebilir
        if (next.account_id || next.supplier_id) {
          overridesOut.push({ invoice_number: inv, ...next });
        }
      }
    } finally {
      setAutoResolving(false);
    }

    onCommitWithOverrides(overridesOut);
  };

  // --- sütunlar (manuel müdahale için kalsın)
  const columns = [
    { title: "Fatura No", dataIndex: "invoice_number", key: "invoice_number", width: 160, render: (v) => <Text code>{v}</Text> },
    {
      title: "Tedarikçi",
      key: "supplier",
      width: 340,
      render: (_, row) => {
        const inv = row.invoice_number;
        const cur = rowOverrides[inv]?.supplier_id;
        return (
          <Space.Compact style={{ width: "100%" }}>
            <Select
              showSearch
              allowClear
              placeholder={row.supplier ? `Seç (mevcut: ${row.supplier})` : "Tedarikçi seç"}
              options={supplierOptions}
              value={cur ?? undefined}
              filterOption={(input, opt) => (opt?.label || "").toLowerCase().includes(input.toLowerCase())}
              onChange={(val) => setOverride(inv, { supplier_id: val || undefined })}
              style={{ flex: 1 }}
            />
          </Space.Compact>
        );
      },
    },
    {
      title: (
        <>
          Hesap Adı {ptid ? <Tag color="blue" style={{ marginLeft: 6 }}>PT {ptid}</Tag> : null}
        </>
      ),
      key: "account",
      width: 360,
      render: (_, row) => {
        const inv = row.invoice_number;
        const cur = rowOverrides[inv]?.account_id;
        return (
          <Space.Compact style={{ width: "100%" }}>
            <Select
              showSearch
              allowClear
              placeholder={row.account_name ? `Seç (mevcut: ${row.account_name})` : "Hesap seç"}
              options={accountOptions}
              value={cur ?? undefined}
              filterOption={(input, opt) => (opt?.label || "").toLowerCase().includes(input.toLowerCase())}
              onChange={(val) => setOverride(inv, { account_id: val || undefined })}
              style={{ flex: 1 }}
              notFoundContent={loadingLists ? "Yükleniyor..." : "Bulunamadı"}
            />
          </Space.Compact>
        );
      },
    },
    {
      title: "Durum",
      key: "status",
      width: 120,
      render: (_, row) => (errorMap.get(row.invoice_number) ? <Tag color="red">Hatalı</Tag> : <Tag>—</Tag>),
    },
  ];

  const dataSource = (onlyErrors ? rowsToShow : selectedRows).map((r, idx) => ({
    key: r.invoice_number || idx,
    ...r,
  }));

  const totalRows = selectedRows.length;
  const errorCount = [...errorMap.keys()].length;

  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <div className="kpi-grid">
        <Kpi label="İşlenecek Fatura" value={totalRows.toLocaleString("tr-TR")} />
        <Kpi label="Hatalı Satır" value={errorCount.toLocaleString("tr-TR")} />
        <div className="kpi-card">
          <span className="kpi-label">Özet</span>
          <div className="pills" style={{ marginTop: 4 }}>
            {ptid ? <span className="pill blue">PT: {ptid}</span> : <span className="pill">PT: —</span>}
            <span className={`pill ${onlyErrors ? "gold" : ""}`}>{onlyErrors ? "Sadece Hatalılar" : "Tümü"}</span>
            <span className="pill green">Oto eşleşme / yaratma açık</span>
          </div>
        </div>
      </div>

      <div className="wiz-toolbar">
        <div>
          <Text strong>Seçili: {selectedRows.length} fatura</Text>
          {ptid ? <Text type="secondary" style={{ marginLeft: 12 }}>(PaymentType={ptid})</Text> : null}
        </div>
        <Space align="center">
          <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            <Switch size="small" checked={onlyErrors} onChange={setOnlyErrors} />
            <Text type="secondary">Sadece hatalıları göster</Text>
          </span>
          <Button onClick={onBack}>Geri</Button>
          <Button
            type="primary"
            loading={commitLoading || autoResolving}
            onClick={handleAutoResolveAndCommit}
          >
            Kaydet
          </Button>
        </Space>
      </div>

      <Table
        size="small"
        columns={columns}
        dataSource={dataSource}
        pagination={{ pageSize: 20 }}
        loading={loadingLists || commitLoading}
        sticky
        scroll={{ y: "60vh" }}
        rowClassName={(row) => (errorMap.get(row.invoice_number) ? "row-error" : "")}
      />
    </Space>
  );
}

