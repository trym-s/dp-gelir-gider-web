import React, { useState, useEffect } from 'react';
import { Form, Input, Button, DatePicker, InputNumber, Select, Modal, message, Divider, Row, Col, Switch, Typography } from "antd";
import { PlusOutlined, EditOutlined, RetweetOutlined, UsergroupAddOutlined } from '@ant-design/icons';
import dayjs from "dayjs";
import { regionService } from '../../../api/regionService';
import { companyService } from '../../../api/companyService';
import { accountNameService } from '../../../api/accountNameService';
import { budgetItemService } from '../../../api/budgetItemService';
import { paymentTypeService } from '../../../api/paymentTypeService';
import styles from '../../shared/Form.module.css';

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;

export default function IncomeForm({ onFinish, initialValues = {}, onCancel, isSaving = false }) {
  const [form] = Form.useForm();
  
  const [allRegions, setAllRegions] = useState([]);
  const [allCompanies, setAllCompanies] = useState([]);
  const [allAccountNames, setAllAccountNames] = useState([]);
  const [allBudgetItems, setAllBudgetItems] = useState([]);
  const [allPaymentTypes, setAllPaymentTypes] = useState([]);

  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [newEntityData, setNewEntityData] = useState({ type: null, name: '', parentId: null });

  const [isEditNameModalVisible, setIsEditNameModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [updatedName, setUpdatedName] = useState('');

  const [isGroupMode, setIsGroupMode] = useState(false);

  const fetchAllDropdownData = async () => {
    try {
      const [regionsData, companiesData, accountNamesData, budgetItemsData, paymentTypesData] = await Promise.all([
        regionService.getAll(), 
        companyService.getAll(), 
        accountNameService.getAll(), 
        budgetItemService.getAll(),
        paymentTypeService.getAll()
      ]);
      setAllRegions(regionsData || []);
      setAllCompanies(companiesData || []);
      setAllAccountNames(accountNamesData || []);
      setAllBudgetItems(budgetItemsData || []);
      setAllPaymentTypes(paymentTypesData || []);
    } catch (error) {
      message.error("Form verileri yüklenirken bir hata oluştu.");
    }
  };

  useEffect(() => {
    fetchAllDropdownData();
  }, []);

  const processedInitialValues = {
    ...initialValues,
    date: initialValues.date ? dayjs(initialValues.date) : dayjs(),
    region_id: initialValues.region?.id,
    company_id: initialValues.company?.id,
    payment_type_id: initialValues.payment_type?.id,
    account_name_id: initialValues.account_name?.id,
    budget_item_id: initialValues.budget_item?.id,
    repeat_count: 12,
  };

  const handleFormSubmit = (values) => {
    const payload = {
      ...values,
      date: values.date ? values.date.format("YYYY-MM-DD") : null,
    };
    onFinish(payload, isGroupMode);
  };

  const showCreateModal = (type) => {
    const parentId = form.getFieldValue(type.parentField);
    setNewEntityData({ type, name: '', parentId });
    setCreateModalVisible(true);
  };

  const handleCreateEntity = async () => {
    const { type, name, parentId } = newEntityData;
    if (!name.trim()) { message.error("İsim boş olamaz!"); return; }

    let entityData = { name };
    let createdEntity;

    try {
        if (type.singular === 'Bölge') {
            createdEntity = await regionService.create(entityData);
        } else if (type.singular === 'Firma') {
            createdEntity = await companyService.create(entityData);
        } else if (type.singular === 'Hesap Adı') {
            if (!parentId) { message.error("Lütfen bir Ödeme Yöntemi seçin!"); return; }
            entityData.payment_type_id = parentId;
            createdEntity = await accountNameService.create(entityData);
        } else if (type.singular === 'Bütçe Kalemi') {
            if (!parentId) { message.error("Lütfen bir Hesap Adı seçin!"); return; }
            entityData.account_name_id = parentId;
            createdEntity = await budgetItemService.create(entityData);
        }
      
        await fetchAllDropdownData();
        form.setFieldsValue({ [type.formField]: createdEntity.id });
        message.success(`${type.singular} başarıyla oluşturuldu.`);
        setCreateModalVisible(false);
        setNewEntityData({ type: null, name: '', parentId: null });

    } catch (error) {
      message.error(`${type.singular} oluşturulurken hata oluştu: ${error.message}`);
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
      else if (type === 'Firma') await companyService.update(id, updateData);
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
      'company_id': { label: 'Firma', items: allCompanies },
      'account_name_id': { label: 'Hesap Adı', items: allAccountNames },
      'payment_type_id': { label: 'Ödeme Yöntemi', items: allPaymentTypes },
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
          
          {!initialValues.id && (
            <Form.Item>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong>Tekrarlı Gelir Grubu Oluştur</Text>
                    <Switch checked={isGroupMode} onChange={setIsGroupMode} />
                </div>
            </Form.Item>
          )}

          {isGroupMode && (
            <>
              <Divider orientation="left" plain>Grup Bilgileri</Divider>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Grup Adı" name="group_name" rules={[{ required: true, message: 'Lütfen bir grup adı girin.' }]}>
                    <Input placeholder="Örn: Aylık Maaşlar" prefix={<UsergroupAddOutlined />}/>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Tekrar Sayısı (Ay)" name="repeat_count" rules={[{ required: true, message: 'Lütfen tekrar sayısını girin.' }]}>
                    <InputNumber min={2} max={60} style={{ width: '100%' }} prefix={<RetweetOutlined />}/>
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}
          
          <Divider orientation="left" plain>Gelir Detayları</Divider>

          <Form.Item label="Açıklama" name="description" rules={[{ required: true, message: 'Lütfen bir açıklama girin.' }]}>
            <TextArea rows={3} placeholder={isGroupMode ? "Grup içindeki her gelirin ana açıklaması..." : "Gelirin açıklaması..."}/>
          </Form.Item>
          
          <Row gutter={16}>
              <Col span={12}>
                  <Form.Item label="Tutar" name="total_amount" rules={[{ required: true, message: 'Lütfen tutarı girin.' }]}>
                    <InputNumber style={{ width: "100%" }} min={0} placeholder="0.00" addonAfter="₺"/>
                  </Form.Item>
              </Col>
              <Col span={12}>
                  <Form.Item label={isGroupMode ? "İlk Gelir Tarihi" : "Tahsilat Tarihi"} name="date" rules={[{ required: true, message: 'Lütfen bir tarih seçin.' }]}>
                    <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                  </Form.Item>
              </Col>
          </Row>

          <Divider orientation="left" plain>Kategorizasyon</Divider>

          <Form.Item label="Bölge" name="region_id" rules={[{ required: true, message: 'Lütfen bir bölge seçin.' }]}>
            <Select placeholder="Bölge seçin" popupRender={(menu) => dropdownRender(menu, { singular: 'Bölge', formField: 'region_id' })}>
              {renderOptions(allRegions, { singular: 'Bölge' })}
            </Select>
          </Form.Item>
          <Form.Item label="Firma" name="company_id" rules={[{ required: true, message: 'Lütfen bir firma seçin.' }]}>
            <Select placeholder="Firma seçin" popupRender={(menu) => dropdownRender(menu, { singular: 'Firma', formField: 'company_id' })}>
              {renderOptions(allCompanies, { singular: 'Firma' })}
            </Select>
          </Form.Item>
          <Form.Item label="Ödeme Yöntemi" name="payment_type_id" rules={[{ required: true, message: 'Lütfen bir ödeme yöntemi seçin.' }]}>
            <Select placeholder="Ödeme yöntemi seçin" popupRender={(menu) => dropdownRender(menu, { singular: 'Ödeme Yöntemi', formField: 'payment_type_id' })}>
              {renderOptions(allPaymentTypes, { singular: 'Ödeme Yöntemi' })}
            </Select>
          </Form.Item>
          <Form.Item label="Hesap Adı" name="account_name_id" rules={[{ required: true, message: 'Lütfen bir hesap seçin.' }]}>
            <Select placeholder="Hesap adı seçin" popupRender={(menu) => dropdownRender(menu, { singular: 'Hesap Adı', formField: 'account_name_id', parentField: 'payment_type_id' })}>
              {renderOptions(allAccountNames, { singular: 'Hesap Adı' })}
            </Select>
          </Form.Item>
          <Form.Item label="Bütçe Kalemi" name="budget_item_id" rules={[{ required: true, message: 'Lütfen bir bütçe kalemi seçin.' }]}>
            <Select placeholder="Bütçe kalemi seçin" popupRender={(menu) => dropdownRender(menu, { singular: 'Bütçe Kalemi', formField: 'budget_item_id', parentField: 'account_name_id' })}>
              {renderOptions(allBudgetItems, { singular: 'Bütçe Kalemi' })}
            </Select>
          </Form.Item>

          <div className={styles.formActions}>
            <Button onClick={onCancel} size="large" disabled={isSaving}>İptal</Button>
            <Button type="primary" htmlType="submit" size="large" loading={isSaving}>
              {isGroupMode ? 'Gelir Grubunu Oluştur' : (initialValues.id ? 'Değişiklikleri Kaydet' : 'Geliri Kaydet')}
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