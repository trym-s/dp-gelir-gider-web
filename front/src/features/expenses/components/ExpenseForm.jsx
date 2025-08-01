import React, { useState, useEffect } from 'react';
import { Form, Input, Button, DatePicker, InputNumber, Select, Modal, message, Divider, Row, Col, Switch, Typography } from "antd";
import { PlusOutlined, EditOutlined, RetweetOutlined, UsergroupAddOutlined } from '@ant-design/icons';
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
  
  // Tüm verileri tutan state'ler
  const [allRegions, setAllRegions] = useState([]);
  const [allPaymentTypes, setAllPaymentTypes] = useState([]);
  const [allAccountNames, setAllAccountNames] = useState([]);
  const [allBudgetItems, setAllBudgetItems] = useState([]);

  // Filtrelenmiş verileri tutan state'ler
  const [filteredPaymentTypes, setFilteredPaymentTypes] = useState([]);
  const [filteredAccountNames, setFilteredAccountNames] = useState([]);
  const [filteredBudgetItems, setFilteredBudgetItems] = useState([]);
  
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [newEntityData, setNewEntityData] = useState({ type: null, name: '', parentId: null });

  const [isEditNameModalVisible, setIsEditNameModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [updatedName, setUpdatedName] = useState('');

  const [isGroupMode, setIsGroupMode] = useState(false);
  const [paymentDay, setPaymentDay] = useState(null); // Ödeme gününü tutacak state
  const isSettingInitialValues = React.useRef(false);
  const isInitialMount = React.useRef(true);
  const isProgrammaticChange = React.useRef(false);

  useEffect(() => {
    const fetchAllDropdownData = async () => {
      try {
        const [regionsData, paymentTypesData, accountNamesData, budgetItemsData] = await Promise.all([
          regionService.getAll(), 
          paymentTypeService.getAll(), 
          accountNameService.getAll(), 
          budgetItemService.getAll()
        ]);
        setAllRegions(regionsData || []);
        setAllPaymentTypes(paymentTypesData || []);
        setAllAccountNames(accountNamesData || []);
        setAllBudgetItems(budgetItemsData || []);
      } catch (error) {
        message.error("Form verileri yüklenirken bir hata oluştu.");
      }
    };
    fetchAllDropdownData();
  }, []);

  // Formu başlangıç değerleriyle dolduran Effect
  useEffect(() => {
    if (initialValues && initialValues.id && allRegions.length > 0) {
        isProgrammaticChange.current = true; // Programatik bir değişiklik olduğunu belirt

        const processedValues = {
            ...initialValues,
            date: initialValues.date ? dayjs(initialValues.date) : dayjs(),
            region_id: initialValues.region?.id,
            payment_type_id: initialValues.payment_type?.id,
            account_name_id: initialValues.account_name?.id,
            budget_item_id: initialValues.budget_item?.id,
            payment_day: initialValues.account_name?.payment_day
        };

        if (processedValues.region_id) {
            setFilteredPaymentTypes(allPaymentTypes.filter(pt => pt.region_id === processedValues.region_id));
        }
        if (processedValues.payment_type_id) {
            setFilteredAccountNames(allAccountNames.filter(an => an.payment_type_id === processedValues.payment_type_id));
        }
        if (processedValues.account_name_id) {
            setFilteredBudgetItems(allBudgetItems.filter(bi => bi.account_name_id === processedValues.account_name_id));
        }

        form.setFieldsValue(processedValues);

        // Değişiklik bittikten sonra kontrol mekanizmasını sıfırla
        setTimeout(() => {
          isProgrammaticChange.current = false;
          isInitialMount.current = false;
        }, 100);
    } else {
      isInitialMount.current = false;
    }
  }, [initialValues, allRegions, allPaymentTypes, allAccountNames, allBudgetItems, form]);

  // Dinamik Filtreleme Effect'leri (DÜZELTİLMİŞ)
  const selectedRegion = Form.useWatch('region_id', form);
  const selectedPaymentType = Form.useWatch('payment_type_id', form);
  const selectedAccountName = Form.useWatch('account_name_id', form);

  // BÖLGE DEĞİŞTİĞİNDE: Ödeme Türlerini Filtrele
  useEffect(() => {
    if (isInitialMount.current || isProgrammaticChange.current) return;
    if (selectedRegion) {
      setFilteredPaymentTypes(allPaymentTypes.filter(pt => pt.region_id === selectedRegion));
    } else {
      setFilteredPaymentTypes([]);
    }
  }, [selectedRegion, allPaymentTypes]);

  // ÖDEME TÜRÜ DEĞİŞTİĞİNDE: Hesap Adlarını Filtrele
  useEffect(() => {
    if (isInitialMount.current || isProgrammaticChange.current) return;
    if (selectedPaymentType) {
      setFilteredAccountNames(allAccountNames.filter(an => an.payment_type_id === selectedPaymentType));
    } else {
      setFilteredAccountNames([]);
    }
  }, [selectedPaymentType, allAccountNames]);

  // HESAP ADI DEĞİŞTİĞİNDE: Bütçe Kalemlerini Filtrele
  useEffect(() => {
    if (isInitialMount.current || isProgrammaticChange.current) return;
    if (selectedAccountName) {
      setFilteredBudgetItems(allBudgetItems.filter(bi => bi.account_name_id === selectedAccountName));
    } else {
      setFilteredBudgetItems([]);
    }
  }, [selectedAccountName, allBudgetItems]);


  // --- 2. Sıfırlama Effect'leri ---
  // Bu effect'ler, SADECE kullanıcı bir üst seçimi değiştirdiğinde çalışır
  // ve alt seçimlerin değerlerini temizler. Listeler güncellendiğinde çalışmazlar.

  // BÖLGE DEĞİŞTİĞİNDE: Alt seçimleri sıfırla
  useEffect(() => {
      if (isInitialMount.current || isProgrammaticChange.current) return;
      form.setFieldsValue({ payment_type_id: null, account_name_id: null, budget_item_id: null });
  }, [selectedRegion]);

  // ÖDEME TÜRÜ DEĞİŞTİĞİNDE: Alt seçimleri sıfırla
  useEffect(() => {
      if (isInitialMount.current || isProgrammaticChange.current) return;
      form.setFieldsValue({ account_name_id: null, budget_item_id: null });
  }, [selectedPaymentType]);

  // HESAP ADI DEĞİŞTİĞİNDE: Alt seçimi sıfırla
  useEffect(() => {
      if (isInitialMount.current || isProgrammaticChange.current) return;
      form.setFieldsValue({ budget_item_id: null });
  }, [selectedAccountName]);



  const processedInitialValues = {
    ...initialValues,
    date: initialValues.date ? dayjs(initialValues.date) : dayjs(),
    region_id: initialValues.region?.id,
    payment_type_id: initialValues.payment_type?.id,
    account_name_id: initialValues.account_name?.id,
    budget_item_id: initialValues.budget_item?.id,
    repeat_count: 12,
  };

  const handleFormSubmit = (values) => {
  // Formdaki tüm değerleri ('payment_day' dahil) alıyoruz.
  // Sadece tarih formatını backend'in anlayacağı şekle getiriyoruz.
  const payload = {
    ...values,
    date: values.date ? values.date.format("YYYY-MM-DD") : null,
  };

  // Bu payload, yeni yazdığımız akıllı backend servisine gönderilecek.
  onFinish(payload, isGroupMode);
};

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
      let entityData = { name };
      let createdEntity;
      let service;
      let stateUpdater;
  
      if (type.singular === 'Bölge') {
        service = regionService;
        stateUpdater = setAllRegions;
      } else if (type.singular === 'Ödeme Türü') {
        if (!parentId) { message.error("Lütfen bir Bölge seçin!"); return; }
        entityData.region_id = parentId;
        service = paymentTypeService;
        stateUpdater = setAllPaymentTypes;
      } else if (type.singular === 'Hesap Adı') {
        if (!parentId) { message.error("Lütfen bir Ödeme Türü seçin!"); return; }
        entityData.payment_type_id = parentId;
        service = accountNameService;
        stateUpdater = setAllAccountNames;
      } else if (type.singular === 'Bütçe Kalemi') {
        if (!parentId) { message.error("Lütfen bir Hesap Adı seçin!"); return; }
        entityData.account_name_id = parentId;
        service = budgetItemService;
        stateUpdater = setAllBudgetItems;
      }
  
      createdEntity = await service.create(entityData);
  
      // --- YENİ VE KESİN ÇÖZÜM BURADA ---
      // 1. Programatik bir değişiklik yaptığımızı belirtiyoruz.
      //    Bu, "sıfırlama" effect'lerinin çalışmasını engelleyecek.
      isProgrammaticChange.current = true;

      // 2. Ana veri listesini güncelliyoruz.
      stateUpdater(prevItems => [...prevItems, createdEntity]);
  
      // 3. Formun ilgili alanına yeni oluşturulan kaydın ID'sini set ediyoruz.
      form.setFieldsValue({ [type.formField]: createdEntity.id });
      
      message.success(`${type.singular} başarıyla oluşturuldu.`);
      setCreateModalVisible(false);
      setNewEntityData({ type: null, name: '', parentId: null });

      // 4. React'in state güncellemelerini işlemesine izin verdikten sonra
      //    kontrol mekanizmasını sıfırlıyoruz.
      setTimeout(() => {
        isProgrammaticChange.current = false;
      }, 100);
  
    } catch (error) {
      const errorMessage = error.response?.data?.message || `${newEntityData.type.singular} oluşturulurken hata oluştu.`;
      message.error(errorMessage);
      // Hata durumunda da kontrol mekanizmasını sıfırlamak önemlidir.
      isProgrammaticChange.current = false; 
    }
  };
  
  const handleAccountChange = (accountId) => {
      const selectedAccount = allAccountNames.find(acc => acc.id === accountId);
      if (selectedAccount && selectedAccount.payment_day) {
          form.setFieldsValue({ payment_day: selectedAccount.payment_day });
      } else {
          form.setFieldsValue({ payment_day: null });
      }
  };
  const showEditNameModal = (item, type, event) => {
    event.stopPropagation();
    setEditingItem({ ...item, type });
    setUpdatedName(item.name);
    setIsEditNameModalVisible(true);
  };

  const handleSaveName = async () => {
    if (!updatedName.trim()) { message.error("İsim boş olamaz!"); return; }
    try {
      const updateData = { name: updatedName };
      const { type, id } = editingItem;

      if (type === 'Bölge') await regionService.update(id, updateData);
      else if (type === 'Ödeme Türü') await paymentTypeService.update(id, updateData);
      else if (type === 'Hesap Adı') await accountNameService.update(id, updateData);
      else if (type === 'Bütçe Kalemi') await budgetItemService.update(id, updateData);
      
      message.success(`${type} başarıyla güncellendi.`);
      setIsEditNameModalVisible(false);
      await fetchAllDropdownData();
    } catch (error) {
      message.error("Güncelleme sırasında bir hata oluştu.");
    }
  };

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
      'region_id': { label: 'Bölge', items: allRegions },
      'payment_type_id': { label: 'Ödeme Türü', items: allPaymentTypes },
      'account_name_id': { label: 'Hesap Adı', items: allAccountNames },
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
        <Form layout="vertical" form={form} onFinish={handleFormSubmit} initialValues={processedInitialValues}>

          {/* Tekrarlı Gider Grubu (Mevcut, dokunulmadı) */}
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
              {/* ... Grup bilgileri kodunuz burada ... */}
            </>
          )}

          <Divider orientation="left" plain>Gider Detayları</Divider>

          <Form.Item label="Açıklama" name="description" rules={[{ required: true, message: 'Lütfen bir açıklama girin.' }]}>
            <TextArea rows={3} placeholder={isGroupMode ? "Grup içindeki her giderin ana açıklaması..." : "Giderin açıklaması..."}/>
          </Form.Item>

          {/* --- YENİ SIRALAMA BAŞLANGICI --- */}
          <Divider orientation="left" plain>Kategorizasyon</Divider>

          {/* 1. Bölge */}
          <Form.Item label="Bölge" name="region_id" rules={[{ required: true, message: 'Lütfen bir bölge seçin.' }]}>
            <Select placeholder="Bölge seçin" popupRender={(menu) => dropdownRender(menu, { singular: 'Bölge', formField: 'region_id' })}>
              {renderOptions(allRegions, { singular: 'Bölge' })}
            </Select>
          </Form.Item>

          {/* 2. Ödeme Türü */}
          <Form.Item label="Ödeme Türü" name="payment_type_id" rules={[{ required: true, message: 'Lütfen bir ödeme türü seçin.' }]}>
            <Select placeholder="Ödeme türü seçin" disabled={!selectedRegion} popupRender={(menu) => dropdownRender(menu, { singular: 'Ödeme Türü', formField: 'payment_type_id', parentField: 'region_id' })}>
              {renderOptions(filteredPaymentTypes, { singular: 'Ödeme Türü' })}
            </Select>
          </Form.Item>

          {/* 3. Hesap Adı */}
          <Form.Item label="Hesap Adı" name="account_name_id" rules={[{ required: true, message: 'Lütfen bir hesap seçin.' }]}>
            <Select 
              placeholder="Hesap adı seçin" 
              disabled={!selectedPaymentType} 
              onChange={handleAccountChange}
              popupRender={(menu) => dropdownRender(menu, { singular: 'Hesap Adı', formField: 'account_name_id', parentField: 'payment_type_id' })}>
              {renderOptions(filteredAccountNames, { singular: 'Hesap Adı' })}
            </Select>
          </Form.Item>

          {/* 4. Bütçe Kalemi */}
          <Form.Item label="Bütçe Kalemi" name="budget_item_id" rules={[{ required: true, message: 'Lütfen bir bütçe kalemi seçin.' }]}>
              <Select placeholder="Bütçe kalemi seçin" disabled={!selectedAccountName} popupRender={(menu) => dropdownRender(menu, { singular: 'Bütçe Kalemi', formField: 'budget_item_id', parentField: 'account_name_id' })}>
                  {renderOptions(filteredBudgetItems, { singular: 'Bütçe Kalemi' })}
              </Select>
          </Form.Item>

          <Divider orientation="left" plain>Finansal Bilgiler</Divider>

          {/* Tutar, Vade ve Ödeme Günü Alanları */}
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
          {/* --- YENİ SIRALAMA SONU --- */}

          {/* Butonlar (Dokunulmadı) */}
          <div className={styles.formActions}>
            <Button onClick={onCancel} size="large" disabled={isSaving}>İptal</Button>
            <Button type="primary" htmlType="submit" size="large" loading={isSaving}>
              {isGroupMode ? 'Gider Grubunu Oluştur' : (initialValues.id ? 'Değişiklikleri Kaydet' : 'Gideri Kaydet')}
            </Button>
          </div>
        </Form>
      </div>
      
      {/* Modal'lar (Mevcut kodunuz, dokunulmadı) */}
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