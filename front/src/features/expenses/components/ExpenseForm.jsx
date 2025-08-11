import React, { useState, useEffect, useCallback } from 'react';
import { Form, Input, Button, DatePicker, InputNumber, Select, Modal, message, Divider, Row, Col, Switch, Typography } from "antd";
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from "dayjs";
import { regionService } from '../../../api/regionService';
import { paymentTypeService } from '../../../api/paymentTypeService';
import { accountNameService } from '../../../api/accountNameService';
import { budgetItemService } from '../../../api/budgetItemService';
import styles from '../../shared/Form.module.css';

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;

export default function ExpenseForm({ onFinish, initialValues = {}, onCancel, isSaving = false }) {
  const [form] = Form.useForm();

  // Data states
  const [regions, setRegions] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [accountNames, setAccountNames] = useState([]);
  const [budgetItems, setBudgetItems] = useState([]);

  // Filtered data states
  const [filteredPaymentTypes, setFilteredPaymentTypes] = useState([]);
  const [filteredAccountNames, setFilteredAccountNames] = useState([]);
  const [filteredBudgetItems, setFilteredBudgetItems] = useState([]);

  // Modal states
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [newEntityData, setNewEntityData] = useState({ type: null, name: '', parentId: null });
  const [isEditNameModalVisible, setIsEditNameModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [updatedName, setUpdatedName] = useState('');
  
  const [isGroupMode, setIsGroupMode] = useState(false);

  // --- Data Fetching ---
  const fetchRegions = useCallback(async () => {
    try {
      const data = await regionService.getAll();
      setRegions(data || []);
      return data || [];
    } catch (error) {
      message.error("Bölgeler yüklenirken bir hata oluştu.");
    }
  }, []);

  const fetchPaymentTypes = useCallback(async () => {
    try {
      const data = await paymentTypeService.getAll();
      setPaymentTypes(data || []);
      return data || [];
    } catch (error) {
      message.error("Ödeme türleri yüklenirken bir hata oluştu.");
    }
  }, []);

  const fetchAccountNames = useCallback(async () => {
    try {
      const data = await accountNameService.getAll();
      setAccountNames(data || []);
      return data || [];
    } catch (error) {
      message.error("Hesap adları yüklenirken bir hata oluştu.");
    }
  }, []);

  const fetchBudgetItems = useCallback(async () => {
    try {
      const data = await budgetItemService.getAll();
      setBudgetItems(data || []);
      return data || [];
    } catch (error) {
      message.error("Bütçe kalemleri yüklenirken bir hata oluştu.");
    }
  }, []);

  useEffect(() => {
    fetchRegions();
    fetchPaymentTypes();
    fetchAccountNames();
    fetchBudgetItems();
  }, [fetchRegions, fetchPaymentTypes, fetchAccountNames, fetchBudgetItems]);

  // --- Form Initialization and Dynamic Filtering ---
  useEffect(() => {
    if (initialValues && initialValues.id && regions.length > 0 && paymentTypes.length > 0 && accountNames.length > 0 && budgetItems.length > 0) {
      const processedValues = {
        ...initialValues,
        date: initialValues.date ? dayjs(initialValues.date) : dayjs(),
        region_id: initialValues.region?.id,
        payment_type_id: initialValues.payment_type?.id,
        account_name_id: initialValues.account_name?.id,
        budget_item_id: initialValues.budget_item?.id,
      };
      
      if (processedValues.region_id) {
        setFilteredPaymentTypes(paymentTypes.filter(pt => pt.region_id === processedValues.region_id));
      }
      if (processedValues.payment_type_id) {
        setFilteredAccountNames(accountNames.filter(an => an.payment_type_id === processedValues.payment_type_id));
      }
      if (processedValues.account_name_id) {
        setFilteredBudgetItems(budgetItems.filter(bi => bi.account_name_id === processedValues.account_name_id));
      }
      
      form.setFieldsValue(processedValues);
    }
  }, [initialValues, regions, paymentTypes, accountNames, budgetItems, form]);

  const selectedRegion = Form.useWatch('region_id', form);
  const selectedPaymentType = Form.useWatch('payment_type_id', form);
  const selectedAccountName = Form.useWatch('account_name_id', form);

  useEffect(() => {
    if (selectedRegion) {
      setFilteredPaymentTypes(paymentTypes.filter(pt => pt.region_id === selectedRegion));
    } else {
      setFilteredPaymentTypes([]);
    }
    form.setFieldsValue({ payment_type_id: null, account_name_id: null, budget_item_id: null });
  }, [selectedRegion, paymentTypes, form]);

  useEffect(() => {
    if (selectedPaymentType) {
      setFilteredAccountNames(accountNames.filter(an => an.payment_type_id === selectedPaymentType));
    } else {
      setFilteredAccountNames([]);
    }
    form.setFieldsValue({ account_name_id: null, budget_item_id: null });
  }, [selectedPaymentType, accountNames, form]);

  useEffect(() => {
    if (selectedAccountName) {
      setFilteredBudgetItems(budgetItems.filter(bi => bi.account_name_id === selectedAccountName));
    } else {
      setFilteredBudgetItems([]);
    }
    form.setFieldsValue({ budget_item_id: null });
  }, [selectedAccountName, budgetItems, form]);


  // --- Modal and Entity Creation ---
  const showCreateModal = (type) => {
    const parentId = form.getFieldValue(type.parentField);
    setNewEntityData({ type, name: '', parentId });
    setCreateModalVisible(true);
  };

  const handleCreateEntity = async () => {
    const { type, name, parentId } = newEntityData;
    if (!name.trim()) {
      message.error("İsim boş olamaz!");
      return;
    }

    try {
      let service, fetcher, entityData = { name };

      switch (type.singular) {
        case 'Bölge':
          service = regionService;
          fetcher = fetchRegions;
          break;
        case 'Ödeme Türü':
          if (!parentId) { message.error("Lütfen bir Bölge seçin!"); return; }
          entityData.region_id = parentId;
          service = paymentTypeService;
          fetcher = fetchPaymentTypes;
          break;
        case 'Hesap Adı':
          if (!parentId) { message.error("Lütfen bir Ödeme Türü seçin!"); return; }
          entityData.payment_type_id = parentId;
          service = accountNameService;
          fetcher = fetchAccountNames;
          break;
        case 'Bütçe Kalemi':
          if (!parentId) { message.error("Lütfen bir Hesap Adı seçin!"); return; }
          entityData.account_name_id = parentId;
          service = budgetItemService;
          fetcher = fetchBudgetItems;
          break;
        default:
          throw new Error("Bilinmeyen varlık türü");
      }

      const createdEntity = await service.create(entityData);
      await fetcher(); // Fetch the updated list

      form.setFieldsValue({ [type.formField]: createdEntity.id });
      
      message.success(`${type.singular} başarıyla oluşturuldu.`);
      setCreateModalVisible(false);
    } catch (error) {
      const errorMessage = error.response?.data?.message || `${newEntityData.type.singular} oluşturulurken hata oluştu.`;
      message.error(errorMessage);
    }
  };

  const handleFormSubmit = (values) => {
    const payload = {
      ...values,
      date: values.date ? values.date.format("YYYY-MM-DD") : null,
    };
    onFinish(payload, isGroupMode);
  };

  // --- Edit Name Modal ---
  const showEditNameModal = (item, type, event) => {
    event.stopPropagation();
    setEditingItem({ ...item, type });
    setUpdatedName(item.name);
    setIsEditNameModalVisible(true);
  };

  const handleSaveName = async () => {
    if (!updatedName.trim()) { message.error("İsim boş olamaz!"); return; }
    try {
      const { type, id } = editingItem;
      const updateData = { name: updatedName };
      let fetcher;

      switch (type) {
        case 'Bölge': await regionService.update(id, updateData); fetcher = fetchRegions; break;
        case 'Ödeme Türü': await paymentTypeService.update(id, updateData); fetcher = fetchPaymentTypes; break;
        case 'Hesap Adı': await accountNameService.update(id, updateData); fetcher = fetchAccountNames; break;
        case 'Bütçe Kalemi': await budgetItemService.update(id, updateData); fetcher = fetchBudgetItems; break;
        default: throw new Error("Bilinmeyen varlık türü");
      }
      
      await fetcher();
      message.success(`${type} başarıyla güncellendi.`);
      setIsEditNameModalVisible(false);
    } catch (error) {
      message.error("Güncelleme sırasında bir hata oluştu.");
    }
  };

  // --- Render Helpers ---
  const renderOptions = (items, type) => {
    return (items || []).map(item => (
      <Option key={item.id} value={item.id}>
        <div className={styles.editOption}>
          <span>{item.name}</span>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={(e) => showEditNameModal(item, type.singular, e)} className={styles.editButton} />
        </div>
      </Option>
    ));
  };

  const dropdownRender = (menu, type) => (
    <>
      {menu}
      <Divider style={{ margin: '8px 0' }} />
      <div className={styles.dropdownFooter}>
        <Button type="text" icon={<PlusOutlined />} onClick={() => showCreateModal(type)}>
          Yeni {type.singular} Ekle
        </Button>
      </div>
    </>
  );
  
  const renderParentSelector = () => {
    const { type, parentId } = newEntityData;
    if (!type || !type.parentField) return null;

    const parentMap = {
      'region_id': { label: 'Bölge', items: regions },
      'payment_type_id': { label: 'Ödeme Türü', items: paymentTypes },
      'account_name_id': { label: 'Hesap Adı', items: accountNames },
    };

    const parentInfo = parentMap[type.parentField];
    if (!parentInfo) return null;

    return (
      <Select
        placeholder={`${parentInfo.label} seçin`}
        defaultValue={parentId}
        style={{ width: '100%', marginTop: 8 }}
        onChange={(value) => setNewEntityData(prev => ({ ...prev, parentId: value }))}
      >
        {(parentInfo.items || []).map(item => <Option key={item.id} value={item.id}>{item.name}</Option>)}
      </Select>
    );
  };

  return (
    <>
      <div className={styles.formContainer}>
        <Form layout="vertical" form={form} onFinish={handleFormSubmit} initialValues={{...initialValues, date: initialValues.date ? dayjs(initialValues.date) : dayjs(), repeat_count: 12}}>
          {!initialValues.id && (
            <Form.Item>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong>Tekrarlı Gider Grubu Oluştur</Text>
                <Switch checked={isGroupMode} onChange={setIsGroupMode} />
              </div>
            </Form.Item>
          )}

          {isGroupMode && (
            <>
              <Divider orientation="left" plain>Grup Bilgileri</Divider>
              {/* Group fields here */}
            </>
          )}

          <Divider orientation="left" plain>Gider Detayları</Divider>
          <Form.Item label="Açıklama" name="description" rules={[{ required: true, message: 'Lütfen bir açıklama girin.' }]}>
            <TextArea rows={3} placeholder={isGroupMode ? "Grup içindeki her giderin ana açıklaması..." : "Giderin açıklaması..."}/>
          </Form.Item>

          <Divider orientation="left" plain>Kategorizasyon</Divider>
          <Form.Item label="Bölge" name="region_id" rules={[{ required: true, message: 'Lütfen bir bölge seçin.' }]}>
            <Select placeholder="Bölge seçin" popupRender={(menu) => dropdownRender(menu, { singular: 'Bölge', formField: 'region_id' })}>
              {renderOptions(regions, { singular: 'Bölge' })}
            </Select>
          </Form.Item>

          <Form.Item label="Ödeme Türü" name="payment_type_id" rules={[{ required: true, message: 'Lütfen bir ödeme türü seçin.' }]}>
            <Select placeholder="Ödeme türü seçin" disabled={!selectedRegion} popupRender={(menu) => dropdownRender(menu, { singular: 'Ödeme Türü', formField: 'payment_type_id', parentField: 'region_id' })}>
              {renderOptions(filteredPaymentTypes, { singular: 'Ödeme Türü' })}
            </Select>
          </Form.Item>

          <Form.Item label="Hesap Adı" name="account_name_id" rules={[{ required: true, message: 'Lütfen bir hesap seçin.' }]}>
            <Select placeholder="Hesap adı seçin" disabled={!selectedPaymentType} popupRender={(menu) => dropdownRender(menu, { singular: 'Hesap Adı', formField: 'account_name_id', parentField: 'payment_type_id' })}>
              {renderOptions(filteredAccountNames, { singular: 'Hesap Adı' })}
            </Select>
          </Form.Item>

          <Form.Item label="Bütçe Kalemi" name="budget_item_id" rules={[{ required: true, message: 'Lütfen bir bütçe kalemi seçin.' }]}>
              <Select placeholder="Bütçe kalemi seçin" disabled={!selectedAccountName} popupRender={(menu) => dropdownRender(menu, { singular: 'Bütçe Kalemi', formField: 'budget_item_id', parentField: 'account_name_id' })}>
                  {renderOptions(filteredBudgetItems, { singular: 'Bütçe Kalemi' })}
              </Select>
          </Form.Item>

          <Divider orientation="left" plain>Finansal Bilgiler</Divider>
          <Row gutter={16}>
              <Col span={8}>
                  <Form.Item label="Tutar" name="amount" rules={[{ required: true, message: 'Lütfen tutarı girin.' }]}>
                    <InputNumber style={{ width: "100%" }} min={0} placeholder="0.00" addonAfter="₺"/>
                  </Form.Item>
              </Col>
              <Col span={8}>
                  <Form.Item label={isGroupMode ? "İlk Gider Vadesi" : "Son Ödeme Tarihi"} name="date" rules={[{ required: true, message: 'Lütfen bir tarih seçin.' }]}>
                    <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                  </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Ödeme Günü" name="payment_day" tooltip="Hesap seçildiğinde otomatik dolar, manuel olarak da seçilebilir.">
                  <Select placeholder="Gün seçin" allowClear>
                    <Select.Option value="Pazartesi">Pazartesi</Select.Option>
                    <Select.Option value="Salı">Salı</Select.Option>
                    <Select.Option value="Çarşamba">Çarşamba</Select.Option>
                    <Select.Option value="Perşembe">Perşembe</Select.Option>
                    <Select.Option value="Cuma">Cuma</Select.Option>
                    <Select.Option value="Cumartesi">Cumartesi</Select.Option>
                    <Select.Option value="Pazar">Pazar</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
          </Row>

          <div className={styles.formActions}>
            <Button onClick={onCancel} size="large" disabled={isSaving}>İptal</Button>
            <Button type="primary" htmlType="submit" size="large" loading={isSaving}>
              {isGroupMode ? 'Gider Grubunu Oluştur' : (initialValues.id ? 'Değişiklikleri Kaydet' : 'Gideri Kaydet')}
            </Button>
          </div>
        </Form>
      </div>
      
      <Modal 
        title={`Yeni ${newEntityData.type?.singular} Ekle`} 
        open={isCreateModalVisible} 
        onOk={handleCreateEntity} 
        onCancel={() => setCreateModalVisible(false)}
      >
        <Input 
          placeholder={`${newEntityData.type?.singular} Adı`} 
          value={newEntityData.name} 
          onChange={(e) => setNewEntityData(prev => ({ ...prev, name: e.target.value }))} 
          autoFocus
        />
        {renderParentSelector()}
      </Modal>
      <Modal 
        title={`${editingItem?.type} Adını Düzenle`} 
        open={isEditNameModalVisible} 
        onOk={handleSaveName} 
        onCancel={() => setIsEditNameModalVisible(false)}
      >
        <Input value={updatedName} onChange={(e) => setUpdatedName(e.target.value)} autoFocus/>
      </Modal>
    </>
  );
}