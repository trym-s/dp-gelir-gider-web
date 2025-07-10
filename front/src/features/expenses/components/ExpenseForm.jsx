import React, { useState, useEffect } from 'react';
import { Form, Input, Button, DatePicker, InputNumber, Select, Space, Modal, message, Divider } from "antd";
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from "dayjs";
// Gider formuna özel servisleri import ediyoruz
import { getRegions, createRegion, updateRegion } from '../../../api/regionService';
import { getPaymentTypes, createPaymentType, updatePaymentType } from '../../../api/paymentTypeService';
import { getAccountNames, createAccountName, updateAccountName } from '../../../api/accountNameService';
import { getBudgetItems, createBudgetItem, updateBudgetItem } from '../../../api/budgetItemService';

const { TextArea } = Input;
const { Option } = Select;

export default function ExpenseForm({ onFinish, initialValues = {}, onCancel }) {
  const [form] = Form.useForm();
  
  // Dropdown state'leri
  const [regions, setRegions] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [accountNames, setAccountNames] = useState([]);
  const [budgetItems, setBudgetItems] = useState([]);
  
  // Yeni öğe ekleme modal'ı
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [newEntityName, setNewEntityName] = useState('');
  const [newEntityType, setNewEntityType] = useState({ singular: '' });

  // İsim düzenleme modal'ı
  const [isEditNameModalVisible, setIsEditNameModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [updatedName, setUpdatedName] = useState('');

  const fetchAllDropdownData = async () => {
    try {
      const [regionsData, paymentTypesData, accountNamesData, budgetItemsData] = await Promise.all([
        getRegions(),
        getPaymentTypes(),
        getAccountNames(),
        getBudgetItems()
      ]);
      setRegions(regionsData);
      setPaymentTypes(paymentTypesData);
      setAccountNames(accountNamesData);
      setBudgetItems(budgetItemsData);
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
    payment_type_id: initialValues.payment_type?.id,
    account_name_id: initialValues.account_name?.id,
    budget_item_id: initialValues.budget_item?.id,
  };

  const handleFormSubmit = (values) => {
    const formattedValues = { ...values, date: values.date ? values.date.format("YYYY-MM-DD") : null };
    onFinish(formattedValues);
  };

  const showCreateModal = (type) => {
    setNewEntityType(type);
    setCreateModalVisible(true);
  };

  const handleCreateEntity = async () => {
    if (!newEntityName.trim()) { message.error("İsim boş olamaz!"); return; }
    try {
      const entityData = { name: newEntityName };
      const type = newEntityType.singular;
      let createdEntity;

      if (type === 'Bölge') {
        createdEntity = await createRegion(entityData);
        setRegions(await getRegions());
        form.setFieldsValue({ region_id: createdEntity.id });
      } else if (type === 'Ödeme Türü') {
        createdEntity = await createPaymentType(entityData);
        setPaymentTypes(await getPaymentTypes());
        form.setFieldsValue({ payment_type_id: createdEntity.id });
      } else if (type === 'Hesap Adı') {
        createdEntity = await createAccountName(entityData);
        setAccountNames(await getAccountNames());
        form.setFieldsValue({ account_name_id: createdEntity.id });
      } else if (type === 'Bütçe Kalemi') {
        createdEntity = await createBudgetItem(entityData);
        setBudgetItems(await getBudgetItems());
        form.setFieldsValue({ budget_item_id: createdEntity.id });
      }
      message.success(`${type} başarıyla oluşturuldu.`);
      setCreateModalVisible(false);
      setNewEntityName('');
    } catch (error) {
      message.error(`${newEntityType.singular} oluşturulurken hata oluştu.`);
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

      if (type === 'Bölge') await updateRegion(id, updateData);
      else if (type === 'Ödeme Türü') await updatePaymentType(id, updateData);
      else if (type === 'Hesap Adı') await updateAccountName(id, updateData);
      else if (type === 'Bütçe Kalemi') await updateBudgetItem(id, updateData);
      
      message.success(`${type} başarıyla güncellendi.`);
      setIsEditNameModalVisible(false);
      await fetchAllDropdownData();
    } catch (error) {
      message.error("Güncelleme sırasında bir hata oluştu.");
    }
  };

  const renderOptions = (items, type) => {
    return items.map(item => (
      <Option key={item.id} value={item.id}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{item.name}</span>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={(e) => showEditNameModal(item, type.singular, e)} />
        </div>
      </Option>
    ));
  };

  return (
    <>
      <Form layout="vertical" form={form} onFinish={handleFormSubmit} initialValues={processedInitialValues}>
        <Form.Item label="Açıklama" name="description" rules={[{ required: true }]}>
          <TextArea rows={3} />
        </Form.Item>
        <Form.Item label="Bölge" name="region_id" rules={[{ required: true }]}>
          <Select placeholder="Bölge seçin" dropdownRender={(menu) => (<>{menu}<Divider style={{ margin: '8px 0' }} /><Button type="text" icon={<PlusOutlined />} onClick={() => showCreateModal({ singular: 'Bölge' })}>Yeni Bölge Ekle</Button></>)}>
            {renderOptions(regions, { singular: 'Bölge' })}
          </Select>
        </Form.Item>
        <Form.Item label="Ödeme Türü" name="payment_type_id" rules={[{ required: true }]}>
          <Select placeholder="Ödeme türü seçin" dropdownRender={(menu) => (<>{menu}<Divider style={{ margin: '8px 0' }} /><Button type="text" icon={<PlusOutlined />} onClick={() => showCreateModal({ singular: 'Ödeme Türü' })}>Yeni Ödeme Türü Ekle</Button></>)}>
            {renderOptions(paymentTypes, { singular: 'Ödeme Türü' })}
          </Select>
        </Form.Item>
        <Form.Item label="Hesap Adı" name="account_name_id" rules={[{ required: true }]}>
          <Select placeholder="Hesap adı seçin" dropdownRender={(menu) => (<>{menu}<Divider style={{ margin: '8px 0' }} /><Button type="text" icon={<PlusOutlined />} onClick={() => showCreateModal({ singular: 'Hesap Adı' })}>Yeni Hesap Ekle</Button></>)}>
            {renderOptions(accountNames, { singular: 'Hesap Adı' })}
          </Select>
        </Form.Item>
        <Form.Item label="Bütçe Kalemi" name="budget_item_id" rules={[{ required: true }]}>
          <Select placeholder="Bütçe kalemi seçin" dropdownRender={(menu) => (<>{menu}<Divider style={{ margin: '8px 0' }} /><Button type="text" icon={<PlusOutlined />} onClick={() => showCreateModal({ singular: 'Bütçe Kalemi' })}>Yeni Bütçe Kalemi Ekle</Button></>)}>
            {renderOptions(budgetItems, { singular: 'Bütçe Kalemi' })}
          </Select>
        </Form.Item>
        <Form.Item label="Tarih" name="date" rules={[{ required: true }]}>
          <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
        </Form.Item>
        <Form.Item label="Tutar" name="amount" rules={[{ required: true }]}>
          <InputNumber style={{ width: "100%" }} min={0} placeholder="₺" />
        </Form.Item>
        <Form.Item>
          <Space style={{ width: "100%", justifyContent: "end" }}>
            <Button onClick={onCancel}>İptal</Button>
            <Button type="primary" htmlType="submit">Kaydet</Button>
          </Space>
        </Form.Item>
      </Form>
      
      <Modal title={`Yeni ${newEntityType.singular} Ekle`} open={isCreateModalVisible} onOk={handleCreateEntity} onCancel={() => setCreateModalVisible(false)}>
        <Input placeholder={`${newEntityType.singular} Adı`} value={newEntityName} onChange={(e) => setNewEntityName(e.target.value)} />
      </Modal>
      <Modal title={`${editingItem?.type} Adını Düzenle`} open={isEditNameModalVisible} onOk={handleSaveName} onCancel={() => setIsEditNameModalVisible(false)}>
        <Input value={updatedName} onChange={(e) => setUpdatedName(e.target.value)} />
      </Modal>
    </>
  );
}