// front/src/features/expenses/components/ExpenseList.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Typography, Button, Input, DatePicker, Row, message, Spin, Alert, Tag, Modal, Space, Switch, Select, Drawer, Badge, Form } from "antd";
import { PlusOutlined, FilterOutlined, PaperClipOutlined } from "@ant-design/icons";
import { useDebounce } from "../../hooks/useDebounce";
import { getExpenses, createExpense, createExpenseGroup, getExpenseGroups } from "../../api/expenseService";
import { regionService } from '../../api/regionService';
import { paymentTypeService } from '../../api/paymentTypeService';
import { accountNameService } from '../../api/accountNameService';
import { budgetItemService } from '../../api/budgetItemService';
import { supplierService } from '../../api/supplierService';
import { ExpenseDetailProvider, useExpenseDetail } from '../../context/ExpenseDetailContext';
import ExpenseForm from "./components/ExpenseForm";
import styles from './ExpenseList.module.css';
import dayjs from "dayjs";
import { Resizable } from 'react-resizable';
import '../../styles/Resizable.css';
import ExpensePdfModal from './components/ExpensePdfModal';
import ImportExpensesWizard from "./components/ImportExpensesWizard";

const { Title } = Typography;
const { RangePicker } = DatePicker;

/* ---------- currency-aware helpers (minimal) ---------- */
const nf = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const CURRENCY_META = {
  TRY: { symbol: "₺" },
  USD: { symbol: "$" },
  EUR: { symbol: "€" },
  GBP: { symbol: "£" },
  AED: { symbol: "د.إ" },
};
const getCurrencyCode = (row) => (row?.currency?.value || row?.currency || "TRY");
const fmtMoney = (v, code) => `${nf.format(Number(v || 0))} ${CURRENCY_META[code]?.symbol || code}`;
const fmtDate = (v) => (v ? dayjs(v).format("DD/MM/YYYY") : "-");

/* ---------- Resizable header cell ---------- */
const ResizableTitle = (props) => {
  const { onResize, width, ...restProps } = props;
  if (!width) return <th {...restProps} />;
  return (
    <Resizable
      width={width}
      height={0}
      handle={<span className="react-resizable-handle" />}
      onResize={onResize}
      draggableOpts={{ enableUserSelectHack: false }}
    >
      <th {...restProps} />
    </Resizable>
  );
};

const EXPENSE_STATUS_MAP = {
  PAID: { color: 'green', text: 'Ödendi' },
  UNPAID: { color: 'red', text: 'Ödenmedi' },
  PARTIALLY_PAID: { color: 'orange', text: 'Kısmi Ödendi' },
  OVERPAID: { color: 'purple', text: 'Fazla Ödendi' },
};

const getStatusTag = (status) => {
  const { color, text } = EXPENSE_STATUS_MAP[status] || { color: 'default', text: status || '-' };
  return <Tag color={color}>{text}</Tag>;
};

const getRowClassName = (record) => {
  switch (record.status) {
    case 'PAID': return 'row-is-complete';
    case 'PARTIALLY_PAID': return 'row-is-partial';
    case 'UNPAID': return 'row-is-danger';
    default: return '';
  }
};

// --- sorter normalizer (antd: array/object; uses columnKey if present) ---
const normalizeSorter = (s) => {
  const obj = Array.isArray(s) ? (s[0] || {}) : (s || {});
  return {
    key: obj.columnKey || obj.field || undefined,
    order: obj.order, // 'ascend' | 'descend' | undefined
  };
};

function ExpenseListContent({ fetchExpenses, pagination, setPagination, refreshKey }) {
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [filters, setFilters] = useState({});
  const [draftFilters, setDraftFilters] = useState({});
  const [sortInfo, setSortInfo] = useState({ field: undefined, order: undefined });
  const [colWidths, setColWidths] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isNewModalVisible, setIsNewModalVisible] = useState(false);
  const [isFilterDrawerVisible, setIsFilterDrawerVisible] = useState(false);

  const [expenseGroups, setExpenseGroups] = useState([]);
  const [regions, setRegions] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [accountNames, setAccountNames] = useState([]);
  const [budgetItems, setBudgetItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [supplierById, setSupplierById] = useState({});

  const [isPdfModalVisible, setIsPdfModalVisible] = useState(false);
  const [selectedExpenseIdForPdf, setSelectedExpenseIdForPdf] = useState(null);
  const [dense, setDense] = useState(false);

  const { openExpenseModal } = useExpenseDetail();
  const debouncedSearchTerm = useDebounce(filters.description, 500);

  // Dropdown datası
  useEffect(() => {
    const loadDropdownData = async () => {
      const results = await Promise.allSettled([
        getExpenseGroups(),
        regionService.getAll(),
        paymentTypeService.getAll(),
        accountNameService.getAll(),
        budgetItemService.getAll(),
        supplierService.getAll(),
      ]);
      const [groups, regionsData, paymentTypesData, accountNamesData, budgetItemsData, suppliersData] = results;

      setExpenseGroups(groups.status === 'fulfilled' ? groups.value : []);
      setRegions(regionsData.status === 'fulfilled' ? regionsData.value : []);
      setPaymentTypes(paymentTypesData.status === 'fulfilled' ? paymentTypesData.value : []);
      setAccountNames(accountNamesData.status === 'fulfilled' ? accountNamesData.value : []);
      setBudgetItems(budgetItemsData.status === 'fulfilled' ? budgetItemsData.value : []);
      setSuppliers(suppliersData.status === 'fulfilled' ? suppliersData.value : []);

      if (results.some(res => res.status === 'rejected')) {
        message.error("Filtre verilerinin bir kısmı yüklenemedi.");
      }
    };
    loadDropdownData();
  }, []);

  // suppliers → id: name map
  useEffect(() => {
    if (!Array.isArray(suppliers)) return;
    const map = {};
    for (const s of suppliers) {
      if (!s) continue;
      map[s.id] = s.name || s.title || s.label || String(s.id);
    }
    setSupplierById(map);
  }, [suppliers]);

  // supplier adı çözücü
  const resolveSupplierName = useCallback((row) => {
    if (row?.supplier_name) return row.supplier_name;

    const s = row?.supplier;
    if (s && typeof s === 'object') {
      const nm = s.name || s.title || s.label;
      if (nm) return nm;
      if (s.id && supplierById[s.id]) return supplierById[s.id];
    }
    if (typeof s === 'number' || (typeof s === 'string' && /^\d+$/.test(s))) {
      const key = Number(s);
      return supplierById[key] ?? `ID:${s}`;
    }
    if (row?.supplier_id != null) {
      const key = Number(row.supplier_id);
      return supplierById[key] ?? `ID:${row.supplier_id}`;
    }
    if (typeof s === 'string') return s;
    return '—';
  }, [supplierById]);

  // Veri çekme
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const activeFilters = {
        description: debouncedSearchTerm,
        date_start: filters.date_start,
        date_end: filters.date_end,
        is_grouped: filters.is_grouped ? 'true' : undefined,
        group_id: filters.group_id,
        status: filters.status && filters.status.length > 0 ? filters.status.join(',') : undefined,
        region_id: filters.region_id && filters.region_id.length > 0 ? filters.region_id.join(',') : undefined,
        payment_type_id: filters.payment_type_id && filters.payment_type_id.length > 0 ? filters.payment_type_id.join(',') : undefined,
        account_name_id: filters.account_name_id && filters.account_name_id.length > 0 ? filters.account_name_id.join(',') : undefined,
        budget_item_id: filters.budget_item_id && filters.budget_item_id.length > 0 ? filters.budget_item_id.join(',') : undefined,
      };

      const response = await fetchExpenses(pagination.current, pagination.pageSize, sortInfo, activeFilters);
      const rows = response.data || [];
      setExpenses(rows);

      // Satırlardan supplier map üret (fallback)
      const fromRows = {};
      for (const r of rows) {
        if (r?.supplier && typeof r.supplier === "object") {
          const id = r.supplier.id;
          const nm = r.supplier.name || r.supplier.title || r.supplier.label;
          if (id && nm) fromRows[id] = nm;
        }
        if (r?.supplier_id && r?.supplier_name) {
          fromRows[r.supplier_id] = r.supplier_name;
        }
      }
      if (Object.keys(fromRows).length) {
        setSupplierById(prev => ({ ...prev, ...fromRows }));
      }

      setPagination(prev => ({ ...prev, total: response.pagination?.total_items ?? rows.length }));
    } catch (err) {
      setError("Giderler yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [fetchExpenses, pagination.current, pagination.pageSize, sortInfo, debouncedSearchTerm, filters, setPagination]);

  useEffect(() => { fetchData(); }, [fetchData, refreshKey]);

  // PDF modal
  const handlePdfModalOpen = (expenseId) => {
    setSelectedExpenseIdForPdf(expenseId);
    setIsPdfModalVisible(true);
  };

  // Table onChange: sort/pagination kontrolü
  const handleTableChange = (p, _f, sorter) => {
    const s = normalizeSorter(sorter);
    setPagination(prev => ({ ...prev, current: p.current, pageSize: p.pageSize }));
    setSortInfo({ field: s.key, order: s.order });
  };

  // Filtreler
  const handleApplyFilters = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
    setFilters(draftFilters);
    setIsFilterDrawerVisible(false);
  };
  const handleClearFilters = () => {
    setDraftFilters({});
    setFilters({});
    setPagination(prev => ({ ...prev, current: 1 }));
    setIsFilterDrawerVisible(false);
  };

  // Create
  const handleCreate = async (values, isGroup) => {
    try {
      if (isGroup) {
        const groupPayload = {
          group_name: values.group_name,
          repeat_count: values.repeat_count,
          expense_template_data: {
            description: values.description,
            amount: values.amount,
            date: values.date,
            region_id: values.region_id,
            payment_type_id: values.payment_type_id,
            account_name_id: values.account_name_id,
            budget_item_id: values.budget_item_id,
            currency: values.currency, // currency dahil
          }
        };
        await createExpenseGroup(groupPayload);
        message.success("Gider grubu başarıyla oluşturuldu.");
      } else {
        await createExpense(values);
        message.success("Yeni gider başarıyla eklendi.");
      }
      setIsNewModalVisible(false);
      fetchData();
    } catch (err) {
      message.error("Yeni gider veya grup eklenirken bir hata oluştu.");
    }
  };

  const activeFilterCount = Object.values(filters).filter(v => v && (!Array.isArray(v) || v.length > 0)).length;

  const tagRender = (props) => {
    const { label, value, closable, onClose } = props;
    const { color } = EXPENSE_STATUS_MAP[value] || {};
    return (
      <Tag color={color} onClose={onClose} closable={closable} style={{ marginRight: 3 }}>
        {label}
      </Tag>
    );
  };

  // Base columns
  const baseColumns = useMemo(() => ([
    { title: "Tarih", dataIndex: "date", key: "date", sorter: true, className: styles.mono },
    { title: "Fatura No", dataIndex: "invoice_number", key: "invoice_number", className: styles.mono },

    { title: "Satıcı / Fatura Adı", key: "invoice",
      render: (_, r) => {
        const supplierName = resolveSupplierName(r);
        const invTitle = r.invoice_name || r.description || null;
        return (
          <div className={styles.twolines}>
            <div className={styles.primary}>{supplierName}</div>
            <div className={styles.secondary}>{invTitle || "—"}</div>
          </div>
        );
      }
    },

    { title: "Hesap", dataIndex: ["account_name", "name"], key: "account_name" },

    // --- currency-aware amounts ---
    {
      title: "Toplam",
      dataIndex: "amount",
      key: "amount",
      sorter: true,
      align: 'right',
      className: styles.mono,
      render: (_, r) => fmtMoney(r.amount, getCurrencyCode(r)),
    },
    {
      title: "Kalan",
      dataIndex: "remaining_amount",
      key: "remaining_amount",
      align: 'right',
      className: styles.mono,
      render: (_, r) => fmtMoney(r.remaining_amount, getCurrencyCode(r)),
    },
    {
      title: "Ödenen / Son Ödeme",
      key: "paid_last",
      render: (_, r) => {
        const cur = getCurrencyCode(r);
        const paid = (r.amount || 0) - (r.remaining_amount || 0);
        return (
          <div style={{ textAlign: "right" }}>
            <div className={styles.mono}>{fmtMoney(paid, cur)}</div>
            <div className={styles.secondary}>{fmtDate(r.last_payment_date || r.completed_at)}</div>
          </div>
        );
      }
    },

    { title: "Bölge", dataIndex: ["region", "name"], key: "region" },
    { title: "Durum", dataIndex: "status", key: "status", sorter: true, render: getStatusTag },

    { title: "Ekler", key: "pdf", align: 'center',
      render: (_, record) => (
        <Button
          icon={<PaperClipOutlined />}
          onClick={(e) => { e.stopPropagation(); handlePdfModalOpen(record.id); }}
        >
          {record.pdf_count > 0 ? `(${record.pdf_count})` : ""}
        </Button>
      )
    },
  ]), [resolveSupplierName, styles]);

  // Resize handler
  const handleResizeHeader = (colKey) => (e, { size }) => {
    setColWidths(prev => ({ ...prev, [colKey]: size.width }));
  };

  // Derived columns (sort state + width + resizable header)
  const columns = useMemo(() => {
    return baseColumns.map(col => {
      const key = col.key || col.dataIndex;
      const isSorted = sortInfo.field === key;
      const width =
        colWidths[key] ??
        col.width ??
        (key === "date" ? 110 :
         key === "invoice_number" ? 160 :
         key === "invoice" ? 360 :
         key === "account_name" ? 170 :
         key === "amount" ? 140 :
         key === "remaining_amount" ? 150 :
         key === "paid_last" ? 200 :
         key === "region" ? 140 :
         key === "status" ? 130 :
         key === "pdf" ? 90 : undefined);

      return {
        ...col,
        width,
        sorter: col.sorter ? col.sorter : undefined,
        sortDirections: col.sorter ? ['ascend', 'descend', 'ascend'] : undefined,
        sortOrder: col.sorter && isSorted ? sortInfo.order : undefined,
        onHeaderCell: () => ({
          width,
          onResize: handleResizeHeader(key),
        }),
      };
    });
  }, [baseColumns, sortInfo, colWidths]);

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Gider Listesi</Title>
        <Space>
          <Space>
            <span style={{ opacity: .7 }}>Kompakt görünüm</span>
            <Switch checked={dense} onChange={setDense} />
          </Space>
          <Badge count={activeFilterCount}>
            <Button icon={<FilterOutlined />} onClick={() => setIsFilterDrawerVisible(true)}>
              Filtrele
            </Button>
          </Badge>
          <Button onClick={() => setIsImportOpen(true)}>
            İçe Aktar
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsNewModalVisible(true)}>
            Yeni Gider
          </Button>
        </Space>
      </Row>

      <ImportExpensesWizard
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onCommitted={() => { setIsImportOpen(false); fetchData(); }}
      />

      <Drawer
        title="Filtrele"
        placement="right"
        onClose={() => setIsFilterDrawerVisible(false)}
        open={isFilterDrawerVisible}
        width={350}
        footer={
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={handleClearFilters}>Temizle</Button>
            <Button type="primary" onClick={handleApplyFilters}>Uygula</Button>
          </Space>
        }
      >
        <Form layout="vertical">
          <Form.Item label="Açıklamada Ara">
            <Input
              placeholder="Açıklamada ara..."
              value={draftFilters.description}
              onChange={(e) => setDraftFilters(prev => ({ ...prev, description: e.target.value }))}
            />
          </Form.Item>
          <Form.Item label="Tarih Aralığı">
            <RangePicker
              style={{ width: "100%" }}
              value={draftFilters.date_start && draftFilters.date_end ? [dayjs(draftFilters.date_start), dayjs(draftFilters.date_end)] : null}
              onChange={(dates) => {
                setDraftFilters(prev => ({
                  ...prev,
                  date_start: dates ? dayjs(dates[0]).format('YYYY-MM-DD') : null,
                  date_end: dates ? dayjs(dates[1]).format('YYYY-MM-DD') : null,
                }));
              }}
              format="DD/MM/YYYY"
            />
          </Form.Item>
          <Form.Item label="Durum">
            <Select
              mode="multiple"
              allowClear
              style={{ width: '100%' }}
              placeholder="Durum seçin"
              value={draftFilters.status}
              onChange={(value) => setDraftFilters(prev => ({ ...prev, status: value }))}
              tagRender={(props) => {
                const { label, value, closable, onClose } = props;
                const { color } = EXPENSE_STATUS_MAP[value] || {};
                return (
                  <Tag color={color} onClose={onClose} closable={closable} style={{ marginRight: 3 }}>
                    {label}
                  </Tag>
                );
              }}
            >
              {Object.entries(EXPENSE_STATUS_MAP).map(([key, { text, color }]) => (
                <Select.Option key={key} value={key}>
                  <Space>
                    <Badge color={color} />
                    {text}
                  </Space>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="Bölge">
            <Select
              mode="multiple"
              allowClear
              style={{ width: '100%' }}
              placeholder="Bölge seçin"
              value={draftFilters.region_id}
              onChange={(value) => setDraftFilters(prev => ({ ...prev, region_id: value }))}
            >
              {regions.map(item => <Select.Option key={item.id} value={item.id}>{item.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item label="Ödeme Türü">
            <Select
              mode="multiple"
              allowClear
              style={{ width: '100%' }}
              placeholder="Ödeme türü seçin"
              value={draftFilters.payment_type_id}
              onChange={(value) => setDraftFilters(prev => ({ ...prev, payment_type_id: value }))}
            >
              {paymentTypes.map(item => <Select.Option key={item.id} value={item.id}>{item.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item label="Hesap Adı">
            <Select
              mode="multiple"
              allowClear
              style={{ width: '100%' }}
              placeholder="Hesap adı seçin"
              value={draftFilters.account_name_id}
              onChange={(value) => setDraftFilters(prev => ({ ...prev, account_name_id: value }))}
            >
              {accountNames.map(item => <Select.Option key={item.id} value={item.id}>{item.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item label="Bütçe Kalemi">
            <Select
              mode="multiple"
              allowClear
              style={{ width: '100%' }}
              placeholder="Bütçe kalemi seçin"
              value={draftFilters.budget_item_id}
              onChange={(value) => setDraftFilters(prev => ({ ...prev, budget_item_id: value }))}
            >
              {budgetItems.map(item => <Select.Option key={item.id} value={item.id}>{item.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item label="Grup">
            <Switch
              checked={draftFilters.is_grouped}
              onChange={(checked) => setDraftFilters(prev => ({ ...prev, is_grouped: checked, group_id: null }))}
            />
          </Form.Item>
          {draftFilters.is_grouped && (
            <Form.Item label="Grup Seçimi">
              <Select
                placeholder="Bir grup seçin"
                allowClear
                style={{ width: '100%' }}
                value={draftFilters.group_id}
                onChange={(value) => setDraftFilters(prev => ({ ...prev, group_id: value }))}
              >
                {expenseGroups.map(group => (
                  <Select.Option key={group.id} value={group.id}>{group.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}
        </Form>
      </Drawer>

      {error && <Alert message={error} type="error" style={{ margin: '16px 0' }} showIcon />}

      <Spin spinning={loading}>
        <Table
          bordered
          size={dense ? "small" : "middle"}
          className={`${styles.modernTable} ${dense ? styles.dense : ""}`}
          components={{ header: { cell: ResizableTitle } }}
          columns={columns}
          dataSource={expenses}
          rowKey="id"
          pagination={pagination}
          onChange={handleTableChange}
          rowClassName={getRowClassName}
          onRow={(record) => ({
            onClick: () => openExpenseModal(record.id),
            style: { cursor: "pointer" },
          })}
        />
      </Spin>

      <Modal
        title="Yeni Gider Ekle"
        open={isNewModalVisible}
        onCancel={() => setIsNewModalVisible(false)}
        destroyOnClose
        footer={null}
      >
        <ExpenseForm onFinish={handleCreate} onCancel={() => setIsNewModalVisible(false)} />
      </Modal>

      {selectedExpenseIdForPdf && (
        <ExpensePdfModal
          expenseId={selectedExpenseIdForPdf}
          visible={isPdfModalVisible}
          onCancel={() => setIsPdfModalVisible(false)}
          onUpdate={fetchData}
        />
      )}
    </div>
  );
}

export default function ExpenseList() {
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchExpenses = useCallback(async (page, pageSize, sort = {}, filters = {}) => {
    const params = {
      page,
      per_page: pageSize,
      sort_by: sort.field,
      sort_order: sort.order === 'ascend' ? 'asc' : (sort.order === 'descend' ? 'desc' : undefined),
      ...filters
    };
    Object.keys(params).forEach(key => { if (!params[key]) delete params[key]; });
    return await getExpenses(params);
  }, []);

  const handleRefresh = () => setRefreshKey(oldKey => oldKey + 1);

  return (
    <ExpenseDetailProvider onExpenseUpdate={handleRefresh}>
      <ExpenseListContent
        fetchExpenses={fetchExpenses}
        pagination={pagination}
        setPagination={setPagination}
        refreshKey={refreshKey}
      />
    </ExpenseDetailProvider>
  );
}

