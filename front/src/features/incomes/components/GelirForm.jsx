import React, { useState, useEffect } from 'react';
import { Form, Input, Button, DatePicker, InputNumber, Select, Modal, message, Divider, Row, Col } from "antd";
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from "dayjs";
import { getCustomers, createCustomer, updateCustomer } from '../../../api/customerService';
import { getRegions, createRegion, updateRegion } from '../../../api/regionService';
import { getAccountNames, createAccountName, updateAccountName } from '../../../api/accountNameService';
import { getBudgetItems, createBudgetItem, updateBudgetItem } from '../../../api/budgetItemService';
import styles from '../../shared/Form.module.css';

const { TextArea } = Input;
const { Option } = Select;

export default function GelirForm({ onFinish, initialValues = {}, onCancel }) {
  const [form] = Form.useForm();
  
  const [customers, setCustomers] = useState([]);
  const [regions, setRegions] = useState([]);
  const [accountNames, setAccountNames] = useState([]);
  const [budgetItems, setBudgetItems] = useState([]);
  
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [newEntityName, setNewEntityName] = useState('');
  const [newEntityType, setNewEntityType] = useState({ singular: '' });
  const [newEntityTaxNumber, setNewEntityTaxNumber] = useState('');

  const [isEditNameModalVisible, setIsEditNameModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [updatedName, setUpdatedName] = useState('');

  // Bu useEffect, dropdown menülerinin seçeneklerini doldurur.
  useEffect(() => {
    const fetchAllDropdownData = async () => {
      try {
        const [customersData, regionsData, accountNamesData, budgetItemsData] = await Promise.all([
          getCustomers(), getRegions(), getAccountNames(), getBudgetItems()
        ]); 
        setCustomers(customersData);
        setRegions(regionsData);
        setAccountNames(accountNamesData);
        setBudgetItems(budgetItemsData);
      } catch (error) {
        message.error("Form verileri yüklenirken bir hata oluştu.");
      }
    };
    fetchAllDropdownData();
  }, []);

  // Bu useEffect, düzenleme modunda formun başlangıç değerlerini güvenli bir şekilde ayarlar.
  useEffect(() => {
    if (initialValues && initialValues.id) {
      const formValues = {
        ...initialValues,
        issue_date: initialValues.issue_date ? dayjs(initialValues.issue_date) : null,
        customer_id: initialValues.customer?.id,
        region_id: initialValues.region?.id,
        account_name_id: initialValues.account_name?.id,
        budget_item_id: initialValues.budget_item?.id,
      };
      form.setFieldsValue(formValues);
    }
  }, [form, initialValues]);

  // --- BU FONKSİYON GÜNCELLENDİ ---
  const handleFormSubmit = (values) => {
    // Backend'e gönderilecek temiz veri paketini (payload) oluşturuyoruz.
    // Antd form'un "values" objesi bazen tüm alanları içermeyebilir,
    // bu yüzden form instance'ından tüm alanları almak en güvenlisidir.
    const allFormValues = form.getFieldsValue();

    const payload = {
      id: initialValues.id, // Güncelleme için ID gerekli
      ...allFormValues, // Formdaki tüm güncel değerleri alıyoruz.
      issue_date: allFormValues.issue_date 
        ? dayjs(allFormValues.issue_date).format("YYYY-MM-DD") 
        : null,
      total_amount: allFormValues.total_amount 
        ? parseFloat(allFormValues.total_amount) 
        : null,
    };
    onFinish(payload);
  };

  const showCreateModal = (type) => {
    setNewEntityType(type);
    setCreateModalVisible(true);
    setNewEntityName('');
    setNewEntityTaxNumber('');
  };

  const handleCreateEntity = async () => {
    if (!newEntityName.trim()) { message.error("İsim boş olamaz!"); return; }
    try {
      const entityData = { 
            name: newEntityName,
            tax_number: newEntityTaxNumber 
      }
      const type = newEntityType.singular;
      let createdEntity;
      let freshData;

      if (type === 'Müşteri') {
        createdEntity = await createCustomer(entityData);
        freshData = await getCustomers();
        setCustomers(freshData);
        form.setFieldsValue({ customer_id: createdEntity.id });
      } else if (type === 'Bölge') {
        createdEntity = await createRegion(entityData);
        freshData = await getRegions();
        setRegions(freshData);
        form.setFieldsValue({ region_id: createdEntity.id });
      } else if (type === 'Hesap Adı') {
        createdEntity = await createAccountName(entityData);
        freshData = await getAccountNames();
        setAccountNames(freshData);
        form.setFieldsValue({ account_name_id: createdEntity.id });
      } else if (type === 'Bütçe Kalemi') {
        createdEntity = await createBudgetItem(entityData);
        freshData = await getBudgetItems();
        setBudgetItems(freshData);
        form.setFieldsValue({ budget_item_id: createdEntity.id });
      }

      message.success(`${type} başarıyla oluşturuldu.`);
      setCreateModalVisible(false);
      setNewEntityName('');
    } catch (error) {
      message.error(error.response?.data?.error || `${newEntityType.singular} oluşturulurken hata oluştu.`);
    }
  };
  
  const handleSaveName = async () => {
    if (!updatedName.trim()) { message.error("İsim boş olamaz!"); return; }
    try {
      const updateData = { 
            name: updatedName, 
            tax_number: editingItem.tax_number // Düzenleme modalında vergi no da güncellenebilir.
      };
      const { type, id } = editingItem;

      if (type === 'Müşteri') await updateCustomer(id, updateData);
      else if (type === 'Bölge') await updateRegion(id, updateData);
      else if (type === 'Hesap Adı') await updateAccountName(id, updateData);
      else if (type === 'Bütçe Kalemi') await updateBudgetItem(id, updateData);
      
      message.success(`${type} başarıyla güncellendi.`);
      setIsEditNameModalVisible(false);
      // Verileri tazeleyelim
      if (type === 'Müşteri') setCustomers(await getCustomers());
      else if (type === 'Bölge') setRegions(await getRegions());
      else if (type === 'Hesap Adı') setAccountNames(await getAccountNames());
      else if (type === 'Bütçe Kalemi') setBudgetItems(await getBudgetItems());

    } catch (error) {
      message.error(error.response?.data?.error || "Güncelleme sırasında bir hata oluştu.");
    }
  };

  const renderOptions = (items, type) => {
    return (items || []).map(item => (
      <Option key={item.id} value={item.id}>
        <div className={styles.editOption}>
          <span>{item.name}</span>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              setEditingItem({ ...item, type: type.singular });
              setUpdatedName(item.name);
              setIsEditNameModalVisible(true);
            }}
            className={styles.editButton}
          />
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

  return (
    <>
      <div className={styles.formContainer}>
        <Form layout="vertical" form={form} onFinish={handleFormSubmit}>
          <Divider orientation="left" plain>Fatura Detayları</Divider>
          <Form.Item label="Fatura İsmi" name="invoice_name" rules={[{ required: true, message: 'Lütfen bir fatura ismi girin.' }]}>
            <TextArea rows={2} placeholder="Örn: Aylık Danışmanlık Hizmeti"/>
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Fatura Numarası" name="invoice_number" rules={[{ required: true, message: 'Lütfen bir fatura numarası girin.' }]}>
                <Input placeholder="Örn: DP-2025-001"/>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Toplam Tutar" name="total_amount" rules={[{ required: true, message: 'Lütfen bir tutar girin.' }]}>
                <InputNumber style={{ width: "100%" }} min={0} placeholder="0.00" addonAfter="₺" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Düzenleme Tarihi" name="issue_date" rules={[{ required: true, message: 'Lütfen bir tarih seçin.' }]}>
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" plain>Kategorizasyon</Divider>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Müşteri" name="customer_id" rules={[{ required: true, message: 'Lütfen bir müşteri seçin.' }]}>
                <Select placeholder="Müşteri seçin" dropdownRender={(menu) => dropdownRender(menu, { singular: 'Müşteri' })} showSearch optionFilterProp="children">
                  {renderOptions(customers, { singular: 'Müşteri' })}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Bölge" name="region_id" rules={[{ required: true, message: 'Lütfen bir bölge seçin.' }]}>
                <Select placeholder="Bölge seçin" dropdownRender={(menu) => dropdownRender(menu, { singular: 'Bölge' })} showSearch optionFilterProp="children">
                  {renderOptions(regions, { singular: 'Bölge' })}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Hesap Adı" name="account_name_id" rules={[{ required: true, message: 'Lütfen bir hesap seçin.' }]}>
                <Select placeholder="Hesap seçin" dropdownRender={(menu) => dropdownRender(menu, { singular: 'Hesap Adı' })} showSearch optionFilterProp="children">
                  {renderOptions(accountNames, { singular: 'Hesap Adı' })}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Bütçe Kalemi" name="budget_item_id" rules={[{ required: true, message: 'Lütfen bir bütçe kalemi seçin.' }]}>
                <Select placeholder="Bütçe kalemi seçin" dropdownRender={(menu) => dropdownRender(menu, { singular: 'Bütçe Kalemi' })} showSearch optionFilterProp="children">
                  {renderOptions(budgetItems, { singular: 'Bütçe Kalemi' })}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <div className={styles.formActions}>
            <Button onClick={onCancel} size="large">İptal</Button>
            <Button type="primary" htmlType="submit" size="large">
              {initialValues.id ? 'Değişiklikleri Kaydet' : 'Geliri Kaydet'}
            </Button>
          </div>
        </Form>
      </div>
      
      <Modal
        title={`Yeni ${newEntityType.singular} Ekle`}
        open={isCreateModalVisible}
        onOk={handleCreateEntity}
        onCancel={() => setCreateModalVisible(false)}
    >
        <Input
            placeholder={`${newEntityType.singular} Adı`}
            value={newEntityName}
            onChange={(e) => setNewEntityName(e.target.value)}
            autoFocus
            style={{ marginBottom: '1rem' }}
        />
        {/* SADECE MÜŞTERİ EKLERKEN GÖRÜNECEK VERGİ NO ALANI */}
        {newEntityType.singular === 'Müşteri' && (
             <Input
                placeholder="Vergi Numarası (Opsiyonel)"
                value={newEntityTaxNumber}
                onChange={(e) => setNewEntityTaxNumber(e.target.value)}
                maxLength={11}
            />
        )}
    </Modal>
      
      <Modal
        title={`${editingItem?.type} Adını Düzenle`}
        open={isEditNameModalVisible}
        onOk={handleSaveName}
        onCancel={() => setIsEditNameModalVisible(false)}
      >
        <Input
          value={updatedName}
          onChange={(e) => setUpdatedName(e.target.value)}
          autoFocus
          style={{ marginBottom: '1rem' }}
        />
        {editingItem?.type === 'Müşteri' && (
            <Input
                placeholder="Vergi Numarası"
                value={editingItem.tax_number || ''}
                onChange={(e) => setEditingItem(prev => ({ ...prev, tax_number: e.target.value }))}
                maxLength={11}
            />
        )}

      </Modal>
    </>
  );
}