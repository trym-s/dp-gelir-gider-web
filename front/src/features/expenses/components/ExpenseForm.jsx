
// front/src/features/expenses/components/ExpenseForm.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  Form,
  Input,
  Button,
  DatePicker,
  InputNumber,
  Select,
  Modal,
  message,
  Divider,
  Row,
  Col,
  Switch,
  Typography,
  Collapse,
  Space,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { regionService } from "../../../api/regionService";
import { paymentTypeService } from "../../../api/paymentTypeService";
import { accountNameService } from "../../../api/accountNameService";
import { budgetItemService } from "../../../api/budgetItemService";
import { supplierService } from "../../../api/supplierService"; // NEW

import styles from "./Form.module.css";

const { TextArea } = Input;
const { Text } = Typography;
const { Option } = Select;
const { Panel } = Collapse;

/* -------------------- Currency metadata -------------------- */
const CURRENCY_META = {
  TRY: { symbol: "₺", label: "Turkish Lira" },
  USD: { symbol: "$", label: "US Dollar" },
  EUR: { symbol: "€", label: "Euro" },
  GBP: { symbol: "£", label: "Pound" },
  AED: { symbol: "د.إ", label: "Dirham" },
};
const getCurrencyMeta = (code) => CURRENCY_META[code] || CURRENCY_META.TRY;

/* Inline select rendered inside InputNumber addonAfter */
function CurrencyInlineSelect({ value, onChange }) {
  const v = value || "TRY";
  const meta = getCurrencyMeta(v);
  return (
    <div className={styles.currencyAddon}>
      {meta.icon ? (
        <img src={meta.icon} alt={v} className={styles.currencyIcon} />
      ) : null}
      <Select
        value={v}
        onChange={onChange}
        className={styles.currencySelectInline}
        dropdownMatchSelectWidth={false}
        bordered={false}
        showSearch
        optionLabelProp="label"
        popupClassName={styles.currencySelectDropdown}
        size="small"
      >
        {Object.entries(CURRENCY_META).map(([code, m]) => (
          <Select.Option key={code} value={code} label={`${code} ${m.symbol}`}>
            <div className={styles.currencyOptionRow}>
              {m.icon ? (
                <img src={m.icon} alt={code} className={styles.currencyIcon} />
              ) : null}
              <span className={styles.currencyCode}>{code}</span>
              <span>{m.symbol}</span>
              <span className={styles.currencyLabel}>— {m.label}</span>
            </div>
          </Select.Option>
        ))}
      </Select>
    </div>
  );
}

export default function ExpenseForm({
  onFinish,
  initialValues = {},
  onCancel,
  isSaving = false,
}) {
  const [form] = Form.useForm();

  /* master lists */
  const [allRegions, setAllRegions] = useState([]);
  const [allPaymentTypes, setAllPaymentTypes] = useState([]);
  const [allAccountNames, setAllAccountNames] = useState([]);
  const [allBudgetItems, setAllBudgetItems] = useState([]);
  const [allSuppliers, setAllSuppliers] = useState([]); // NEW

  /* filtered lists */
  const [filteredPaymentTypes, setFilteredPaymentTypes] = useState([]);
  const [filteredAccountNames, setFilteredAccountNames] = useState([]);
  const [filteredBudgetItems, setFilteredBudgetItems] = useState([]);

  /* create modal */
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [newEntityData, setNewEntityData] = useState({
    type: null,
    name: "",
    parentId: null,
  });

  /* rename modal */
  const [isEditNameModalVisible, setIsEditNameModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [updatedName, setUpdatedName] = useState("");

  const [isGroupMode, setIsGroupMode] = useState(false);

  const isInitialMount = useRef(true);
  const isProgrammaticChange = useRef(false);

  /* watch form values */
  const selectedRegion = Form.useWatch("region_id", form);
  const selectedPaymentType = Form.useWatch("payment_type_id", form);
  const selectedAccountName = Form.useWatch("account_name_id", form);
  const selectedCurrency = Form.useWatch("currency", form) || "TRY";
  const lines = Form.useWatch("lines", form) || [];

  /* bootstrap */
  useEffect(() => {
    (async () => {
      try {
        const [regions, payTypes, accounts, budgets, suppliers] = await Promise.all([
          regionService.getAll(),
          paymentTypeService.getAll(),
          accountNameService.getAll(),
          budgetItemService.getAll(),
          supplierService.getAll(), // NEW
        ]);
        setAllRegions(regions || []);
        setAllPaymentTypes(payTypes || []);
        setAllAccountNames(accounts || []);
        setAllBudgetItems(budgets || []);
        setAllSuppliers(suppliers || []); // NEW
      } catch {
        message.error("Form verileri yüklenemedi.");
      }
    })();
  }, []);

  /* set initial values after data is ready */
  useEffect(() => {
    if (initialValues?.id && allRegions.length > 0) {
      isProgrammaticChange.current = true;

      const v = {
        ...initialValues,
        date: initialValues.date ? dayjs(initialValues.date) : dayjs(),
        region_id: initialValues.region?.id,
        payment_type_id: initialValues.payment_type?.id,
        account_name_id: initialValues.account_name?.id,
        budget_item_id: initialValues.budget_item?.id,
        payment_day: initialValues.account_name?.payment_day,
        currency: initialValues.currency || "TRY",
        supplier_id: initialValues.supplier?.id || null, // NEW
        invoice_name: initialValues.invoice_name || null, // NEW
        invoice_number: initialValues.invoice_number || null, // NEW
        lines: (initialValues.lines || []).map((ln) => ({
          item_name: ln.item_name ?? null,
          quantity: ln.quantity ?? null,
          unit_price: ln.unit_price ?? null,
          discount: ln.discount ?? null,
          kdv_amount: ln.kdv_amount ?? null,
          tevkifat_amount: ln.tevkifat_amount ?? null,
          otv_amount: ln.otv_amount ?? null,
          oiv_amount: ln.oiv_amount ?? null,
          net_amount_try: ln.net_amount_try ?? null,
        })),
      };

      if (v.region_id) {
        setFilteredPaymentTypes(
          allPaymentTypes.filter((pt) => pt.region_id === v.region_id)
        );
      }
      if (v.payment_type_id) {
        setFilteredAccountNames(
          allAccountNames.filter((an) => an.payment_type_id === v.payment_type_id)
        );
      }
      if (v.account_name_id) {
        setFilteredBudgetItems(
          allBudgetItems.filter((bi) => bi.account_name_id === v.account_name_id)
        );
      }

      form.setFieldsValue(v);

      setTimeout(() => {
        isProgrammaticChange.current = false;
        isInitialMount.current = false;
      }, 80);
    } else {
      isInitialMount.current = false;
    }
  }, [
    initialValues,
    allRegions,
    allPaymentTypes,
    allAccountNames,
    allBudgetItems,
    form,
  ]);

  /* dynamic filtering */
  useEffect(() => {
    if (isInitialMount.current || isProgrammaticChange.current) return;
    setFilteredPaymentTypes(
      selectedRegion
        ? allPaymentTypes.filter((pt) => pt.region_id === selectedRegion)
        : []
    );
    form.setFieldsValue({
      payment_type_id: null,
      account_name_id: null,
      budget_item_id: null,
    });
  }, [selectedRegion]);

  useEffect(() => {
    if (isInitialMount.current || isProgrammaticChange.current) return;
    setFilteredAccountNames(
      selectedPaymentType
        ? allAccountNames.filter((an) => an.payment_type_id === selectedPaymentType)
        : []
    );
    form.setFieldsValue({ account_name_id: null, budget_item_id: null });
  }, [selectedPaymentType]);

  useEffect(() => {
    if (isInitialMount.current || isProgrammaticChange.current) return;
    setFilteredBudgetItems(
      selectedAccountName
        ? allBudgetItems.filter((bi) => bi.account_name_id === selectedAccountName)
        : []
    );
    form.setFieldsValue({ budget_item_id: null });
  }, [selectedAccountName]);

  /* processed defaults */
  const processedInitialValues = {
    ...initialValues,
    date: initialValues.date ? dayjs(initialValues.date) : dayjs(),
    region_id: initialValues.region?.id,
    payment_type_id: initialValues.payment_type?.id,
    account_name_id: initialValues.account_name?.id,
    budget_item_id: initialValues.budget_item?.id,
    currency: initialValues.currency || "TRY",
    supplier_id: initialValues.supplier?.id || null, // NEW
  };

  /* submit */
  const handleFormSubmit = (values) => {
    const payload = {
      ...values,
      date: values.date ? values.date.format("YYYY-MM-DD") : null,
      currency: values.currency || "TRY",
      supplier_id: values.supplier_id || null,
      invoice_name: values.invoice_name?.trim() || null,
      invoice_number: values.invoice_number?.trim() || null,
      lines: Array.isArray(values.lines)
        ? values.lines.map((ln) => ({
            item_name: ln?.item_name?.trim() || null,
            quantity: ln?.quantity ?? null,
            unit_price: ln?.unit_price ?? null,
            discount: ln?.discount ?? null,
            kdv_amount: ln?.kdv_amount ?? null,
            tevkifat_amount: ln?.tevkifat_amount ?? null,
            otv_amount: ln?.otv_amount ?? null,
            oiv_amount: ln?.oiv_amount ?? null,
            net_amount_try: ln?.net_amount_try ?? null,
          }))
        : [],
    };
    onFinish(payload, isGroupMode);
  };

  /* account select side-effect: auto-fill payment_day if available */
  const handleAccountChange = (accountId) => {
    const acc = allAccountNames.find((a) => a.id === accountId);
    form.setFieldsValue({ payment_day: acc?.payment_day ?? null });
  };

  /* modal actions */
  const showCreateModal = (type) => {
    const parentId = type.parentField ? form.getFieldValue(type.parentField) : null;
    setNewEntityData({ type, name: "", parentId });
    setCreateModalVisible(true);
  };

  const handleCreateEntity = async () => {
    const { type, name, parentId } = newEntityData;
    if (!name.trim()) {
      message.error("Name cannot be empty.");
      return;
    }

    try {
      let entityData = { name };
      let created;
      let service;
      let updateList;

      if (type.singular === "Region") {
        service = regionService;
        updateList = setAllRegions;
      } else if (type.singular === "Payment Type") {
        if (!parentId) return message.error("Select a Region first.");
        entityData.region_id = parentId;
        service = paymentTypeService;
        updateList = setAllPaymentTypes;
      } else if (type.singular === "Account Name") {
        if (!parentId) return message.error("Select a Payment Type first.");
        entityData.payment_type_id = parentId;
        service = accountNameService;
        updateList = setAllAccountNames;
      } else if (type.singular === "Budget Item") {
        if (!parentId) return message.error("Select an Account Name first.");
        entityData.account_name_id = parentId;
        service = budgetItemService;
        updateList = setAllBudgetItems;
      } else if (type.singular === "Supplier") {
        service = supplierService;
        updateList = setAllSuppliers;
      }

      created = await (service.create(entityData));
      isProgrammaticChange.current = true;
      updateList((prev) => [...prev, created]);

      if (type.formField) {
        form.setFieldsValue({ [type.formField]: created.id });
      }
      message.success(`${type.singular} created.`);
      setCreateModalVisible(false);
      setNewEntityData({ type: null, name: "", parentId: null });

      setTimeout(() => (isProgrammaticChange.current = false), 60);
    } catch (e) {
      message.error(
        e?.response?.data?.message || `Failed to create ${newEntityData.type?.singular}.`
      );
      isProgrammaticChange.current = false;
    }
  };

  const showEditNameModal = (item, type, e) => {
    e.stopPropagation();
    setEditingItem({ ...item, type });
    setUpdatedName(item.name);
    setIsEditNameModalVisible(true);
  };

  const handleSaveName = async () => {
    if (!updatedName.trim()) return message.error("Name cannot be empty.");
    try {
      const { type, id } = editingItem;
      const data = { name: updatedName };

      if (type === "Region") await regionService.update(id, data);
      else if (type === "Payment Type") await paymentTypeService.update(id, data);
      else if (type === "Account Name") await accountNameService.update(id, data);
      else if (type === "Budget Item") await budgetItemService.update(id, data);
      else if (type === "Supplier") await supplierService.update(id, data);

      message.success(`${type} updated.`);
      setIsEditNameModalVisible(false);

      const [regions, payTypes, accounts, budgets, suppliers] = await Promise.all([
        regionService.getAll(),
        paymentTypeService.getAll(),
        accountNameService.getAll(),
        budgetItemService.getAll(),
        supplierService.getAll(),
      ]);
      setAllRegions(regions || []);
      setAllPaymentTypes(payTypes || []);
      setAllAccountNames(accounts || []);
      setAllBudgetItems(budgets || []);
      setAllSuppliers(suppliers || []);
    } catch {
      message.error("Update failed.");
    }
  };

  const renderOptions = (items, type) =>
    (items || []).map((item) => (
      <Option key={item.id} value={item.id}>
        <div className={styles.editOption}>
          <span>{item.name}</span>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={(e) => showEditNameModal(item, type.singular, e)}
            className={styles.editButton}
          />
        </div>
      </Option>
    ));

  const dropdownRender = (menu, type) => (
    <>
      {menu}
      <Divider style={{ margin: "8px 0" }} />
      <div className={styles.dropdownFooter}>
        <Button type="text" icon={<PlusOutlined />} onClick={() => showCreateModal(type)}>
          New {type.singular}
        </Button>
      </div>
    </>
  );

  const renderParentSelector = () => {
    const { type, parentId } = newEntityData;
    if (!type || !type.parentField) return null;

    const parentMap = {
      region_id: { label: "Region", items: allRegions },
      payment_type_id: { label: "Payment Type", items: allPaymentTypes },
      account_name_id: { label: "Account Name", items: allAccountNames },
    };

    const info = parentMap[type.parentField];
    if (!info) return null;

    return (
      <Select
        placeholder={`Select ${info.label}`}
        defaultValue={parentId}
        style={{ width: "100%", marginTop: 8 }}
        onChange={(val) => setNewEntityData((p) => ({ ...p, parentId: val }))}
      >
        {(info.items || []).map((it) => (
          <Option key={it.id} value={it.id}>
            {it.name}
          </Option>
        ))}
      </Select>
    );
  };

  const currencyAddon = (
    <Form.Item name="currency" noStyle>
      <CurrencyInlineSelect
        value={selectedCurrency}
        onChange={(code) => form.setFieldsValue({ currency: code })}
      />
    </Form.Item>
  );

  // quick helper: compute naive line total (client-side hint only)
  const lineTotal = (ln) => {
    const q = Number(ln?.quantity ?? 0);
    const up = Number(ln?.unit_price ?? 0);
    const disc = Number(ln?.discount ?? 0);
    const taxes =
      Number(ln?.kdv_amount ?? 0) +
      Number(ln?.tevkifat_amount ?? 0) +
      Number(ln?.otv_amount ?? 0) +
      Number(ln?.oiv_amount ?? 0);
    return (q * up - disc + taxes).toFixed(2);
  };

  return (
    <>
      <div className={styles.formContainer}>
        <Form
          layout="vertical"
          form={form}
          onFinish={handleFormSubmit}
          initialValues={processedInitialValues}
        >
          {!initialValues.id && (
            <Form.Item>
              <div className={styles.rowBetween}>
                <Text strong>Tekrarlı Gider Grubu Oluştur</Text>
                <Switch checked={isGroupMode} onChange={setIsGroupMode} />
              </div>
            </Form.Item>
          )}

          {isGroupMode && (
            <>
              <Divider orientation="left" plain>
                Group
              </Divider>
              {/* future group fields */}
            </>
          )}

          <Divider orientation="left" plain>
            Detaylar
          </Divider>

          <Form.Item
            label="Açıklama"
            name="description"
            rules={[{ required: true, message: "Lütfen Bir Açıklama Giriniz" }]}
          >
            <TextArea rows={3} placeholder="Gider için açıklama" />
          </Form.Item>

          <Divider orientation="left" plain>
            Categorization
          </Divider>

          <Form.Item
            label="Bölge"
            name="region_id"
            rules={[{ required: true, message: "Lütfen Bir Bölge Seçiniz" }]}
          >
            <Select
              placeholder="Bölge Seç"
              popupRender={(menu) =>
                dropdownRender(menu, { singular: "Region", formField: "region_id" })
              }
            >
              {renderOptions(allRegions, { singular: "Region" })}
            </Select>
          </Form.Item>

          <Form.Item
            label="Ödeme Türü"
            name="payment_type_id"
            rules={[{ required: true, message: "Lütfen Bir Ödeme Türü Seçiniz." }]}
          >
            <Select
              placeholder="Ödeme Türü Seç"
              disabled={!selectedRegion}
              popupRender={(menu) =>
                dropdownRender(menu, {
                  singular: "Payment Type",
                  formField: "payment_type_id",
                  parentField: "region_id",
                })
              }
            >
              {renderOptions(filteredPaymentTypes, { singular: "Payment Type" })}
            </Select>
          </Form.Item>

          <Form.Item
            label="Hesap Adı"
            name="account_name_id"
            rules={[{ required: true, message: "Lütfen Bir Hesap Adı Seçiniz." }]}
          >
            <Select
              placeholder="Hesap Adı Seç"
              disabled={!selectedPaymentType}
              onChange={handleAccountChange}
              popupRender={(menu) =>
                dropdownRender(menu, {
                  singular: "Account Name",
                  formField: "account_name_id",
                  parentField: "payment_type_id",
                })
              }
            >
              {renderOptions(filteredAccountNames, { singular: "Account Name" })}
            </Select>
          </Form.Item>

          <Form.Item
            label="Bütçe Kalemi"
            name="budget_item_id"
            rules={[{ required: true, message: "Lütfen Bir Bütçe Kalemi Seçiniz." }]}
          >
            <Select
              placeholder="Bütçe Kalemi Seç"
              disabled={!selectedAccountName}
              popupRender={(menu) =>
                dropdownRender(menu, {
                  singular: "Budget Item",
                  formField: "budget_item_id",
                  parentField: "account_name_id",
                })
              }
            >
              {renderOptions(filteredBudgetItems, { singular: "Budget Item" })}
            </Select>
          </Form.Item>

          <Divider orientation="left" plain>
            Finans
          </Divider>

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                label="Tutar"
                name="amount"
                rules={[{ required: true, message: "Lütfen Tutar Giriniz." }]}
              >
                <InputNumber
                  style={{ width: "140px" }}
                  min={0}
                  placeholder="0.00"
                  stringMode
                  addonAfter={currencyAddon}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                label={isGroupMode ? "İlk Vade Tarihi" : "Vade Tarihi"}
                name="date"
                rules={[{ required: true, message: "Lütfen Bir Vade Tarihi Seçiniz." }]}
              >
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                label="Ödeme Günü"
                name="payment_day"
                tooltip="Hesaptan gelirse otomatik dolar; elle de seçebilirsin."
              >
                <Select placeholder="Gün Seç" allowClear>
                  <Option value="Monday">Pazartesi</Option>
                  <Option value="Tuesday">Salı</Option>
                  <Option value="Wednesday">Çarşamba</Option>
                  <Option value="Thursday">Perşembe</Option>
                  <Option value="Friday">Cuma</Option>
                  <Option value="Saturday">Cumartesi</Option>
                  <Option value="Sunday">Pazar</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* ---------- Advanced (nullable) details ---------- */}
          <Collapse
            bordered={false}
            className={styles.advancedCollapse}
          >
            <Panel header="Detaylar (gelişmiş – opsiyonel)" key="adv">
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item label="Satıcı (Supplier)" name="supplier_id">
                    <Select
                      placeholder="Supplier seç (opsiyonel)"
                      allowClear
                      showSearch
                      optionFilterProp="children"
                      popupRender={(menu) =>
                        dropdownRender(menu, {
                          singular: "Supplier",
                          formField: "supplier_id",
                        })
                      }
                    >
                      {renderOptions(allSuppliers, { singular: "Supplier" })}
                    </Select>
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item label="Fatura Adı" name="invoice_name">
                    <Input placeholder="Örn: Neova Komisyon Temmuz 2025" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item label="Fatura No" name="invoice_number">
                    <Input placeholder="Örn: OST2025000000183" />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left" plain>
                Expense Lines (opsiyonel)
              </Divider>

              <Form.List name="lines">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...rest }) => {
                      const ln = lines?.[name] || {};
                      return (
                        <div key={key} className={styles.lineCard}>
                          <Row gutter={8}>
                            <Col span={8}>
                              <Form.Item
                                {...rest}
                                name={[name, "item_name"]}
                                label="Kalem"
                              >
                                <Input placeholder="Kalem adı" />
                              </Form.Item>
                            </Col>
                            <Col span={4}>
                              <Form.Item
                                {...rest}
                                name={[name, "quantity"]}
                                label="Miktar"
                              >
                                <InputNumber style={{ width: "100%" }} min={0} precision={3} />
                              </Form.Item>
                            </Col>
                            <Col span={4}>
                              <Form.Item
                                {...rest}
                                name={[name, "unit_price"]}
                                label="Birim Fiyat"
                              >
                                <InputNumber style={{ width: "100%" }} min={0} precision={2} />
                              </Form.Item>
                            </Col>
                            <Col span={4}>
                              <Form.Item
                                {...rest}
                                name={[name, "discount"]}
                                label="İndirim"
                              >
                                <InputNumber style={{ width: "100%" }} min={0} precision={2} />
                              </Form.Item>
                            </Col>
                            <Col span={4}>
                              <Form.Item
                                {...rest}
                                name={[name, "kdv_amount"]}
                                label="KDV"
                              >
                                <InputNumber style={{ width: "100%" }} min={0} precision={2} />
                              </Form.Item>
                            </Col>

                            <Col span={4}>
                              <Form.Item
                                {...rest}
                                name={[name, "tevkifat_amount"]}
                                label="Tevkifat"
                              >
                                <InputNumber style={{ width: "100%" }} min={0} precision={2} />
                              </Form.Item>
                            </Col>
                            <Col span={4}>
                              <Form.Item
                                {...rest}
                                name={[name, "otv_amount"]}
                                label="ÖTV"
                              >
                                <InputNumber style={{ width: "100%" }} min={0} precision={2} />
                              </Form.Item>
                            </Col>
                            <Col span={4}>
                              <Form.Item
                                {...rest}
                                name={[name, "oiv_amount"]}
                                label="ÖİV"
                              >
                                <InputNumber style={{ width: "100%" }} min={0} precision={2} />
                              </Form.Item>
                            </Col>
                            <Col span={4}>
                              <Form.Item
                                {...rest}
                                name={[name, "net_amount_try"]}
                                label="Net (TRY)"
                              >
                                <InputNumber style={{ width: "100%" }} min={0} precision={2} />
                              </Form.Item>
                            </Col>

                            <Col span={8}>
                              <div className={styles.lineFooter}>
                                <Text type="secondary">
                                  Satır toplam (ipucu): {lineTotal(ln)} {selectedCurrency}
                                </Text>
                              </div>
                            </Col>

                            <Col span={4} style={{ display: "flex", alignItems: "end" }}>
                              <Button
                                danger
                                type="text"
                                icon={<DeleteOutlined />}
                                onClick={() => remove(name)}
                              >
                                Kaldır
                              </Button>
                            </Col>
                          </Row>
                        </div>
                      );
                    })}

                    <Space>
                      <Button
                        type="dashed"
                        onClick={() => add({})}
                        icon={<PlusOutlined />}
                      >
                        Satır Ekle
                      </Button>
                      <Text type="secondary">
                        Satırlar opsiyoneldir; toplamı elle “Tutar” alanına yazabilirsin.
                      </Text>
                    </Space>
                  </>
                )}
              </Form.List>
            </Panel>
          </Collapse>

          <div className={styles.formActions}>
            <Button onClick={onCancel} size="large" disabled={isSaving}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" size="large" loading={isSaving}>
              {isGroupMode
                ? "Tekrarlı Gider Grubu Oluştur"
                : initialValues.id
                ? "Değişiklikleri Kaydet"
                : "Gider Oluştur"}
            </Button>
          </div>
        </Form>
      </div>

      {/* Create modal */}
      <Modal
        title={`New ${newEntityData.type?.singular}`}
        open={isCreateModalVisible}
        onOk={handleCreateEntity}
        onCancel={() => setCreateModalVisible(false)}
      >
        <Input
          placeholder={`${newEntityData.type?.singular} name`}
          value={newEntityData.name}
          onChange={(e) =>
            setNewEntityData((p) => ({ ...p, name: e.target.value }))
          }
          autoFocus
        />
        {renderParentSelector()}
      </Modal>

      {/* Rename modal */}
      <Modal
        title={`Rename ${editingItem?.type}`}
        open={isEditNameModalVisible}
        onOk={handleSaveName}
        onCancel={() => setIsEditNameModalVisible(false)}
      >
        <Input
          value={updatedName}
          onChange={(e) => setUpdatedName(e.target.value)}
          autoFocus
        />
      </Modal>
    </>
  );
}

