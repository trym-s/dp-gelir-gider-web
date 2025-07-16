import React, { useState, useEffect } from 'react';
import { Form, Input, Button, DatePicker, InputNumber, Select, Modal, message, Divider, Row, Col } from "antd";
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from "dayjs";
import { getCompanies, createCompany, updateCompany } from '../../../api/companyService';
import { getRegions, createRegion, updateRegion } from '../../../api/regionService';
import { getAccountNames, createAccountName, updateAccountName } from '../../../api/accountNameService';
import { getBudgetItems, createBudgetItem, updateBudgetItem } from '../../../api/budgetItemService';
import styles from '../../shared/Form.module.css';

const { TextArea } = Input;
const { Option } = Select;

export default function GelirForm({ onFinish, initialValues = {}, onCancel }) {
  const [form] = Form.useForm();
  
  const [companies, setCompanies] = useState([]);
  const [regions, setRegions] = useState([]);
  const [accountNames, setAccountNames] = useState([]);
  const [budgetItems, setBudgetItems] = useState([]);
  
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [newEntityName, setNewEntityName] = useState('');
  const [newEntityType, setNewEntityType] = useState({ singular: '' });

  const [isEditNameModalVisible, setIsEditNameModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [updatedName, setUpdatedName] = useState('');

  const fetchAllDropdownData = async () => {
    try {
      const [companiesData, regionsData, accountNamesData, budgetItemsData] = await Promise.all([
        getCompanies(), getRegions(), getAccountNames(), getBudgetItems()
      ]);
      setCompanies(companiesData);
      setRegions(regionsData);
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
    company_id: initialValues.company?.id,
    region_id: initialValues.region?.id,
    account_name_id: initialValues.account_name?.id,
    budget_item_id: initialValues.budget_item?.id,
  };

  const handleFormSubmit = (values) => {
    const formattedValues = { 
      ...initialValues,
      ...values,
      date: values.date ? values.date.format("YYYY-MM-DD") : null 
    };
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

      if (type === 'Şirket') {
        createdEntity = await createCompany(entityData);
        setCompanies(await getCompanies());
        form.setFieldsValue({ company_id: createdEntity.id });
      } else if (type === 'Bölge') {
        createdEntity = await createRegion(entityData);
        setRegions(await getRegions());
        form.setFieldsValue({ region_id: createdEntity.id });
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

      if (type === 'Şirket') await updateCompany(id, updateData);
      else if (type === 'Bölge') await updateRegion(id, updateData);
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
        <Form layout="vertical" form={form} onFinish={handleFormSubmit} initialValues={processedInitialValues}>
          
          <Divider orientation="left" plain>Gelir Detayları</Divider>
          
          <Form.Item label="Açıklama" name="description" rules={[{ required: true, message: 'Lütfen bir açıklama girin.' }]}>
            <TextArea rows={3} placeholder="Gelirin açıklaması..."/>
          </Form.Item>

          <Row gutter={16}>
              <Col span={12}>
                  <Form.Item label="Tutar" name="total_amount" rules={[{ required: true, message: 'Lütfen bir tutar girin.' }]}>
                    <InputNumber style={{ width: "100%" }} min={0} placeholder="0.00" addonAfter="₺" />
                  </Form.Item>
              </Col>
              <Col span={12}>
                  <Form.Item label="Tarih" name="date" rules={[{ required: true, message: 'Lütfen bir tarih seçin.' }]}>
                    <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                  </Form.Item>
              </Col>
          </Row>

          <Divider orientation="left" plain>Kategorizasyon</Divider>

          <Form.Item label="Şirket" name="company_id" rules={[{ required: true, message: 'Lütfen bir şirket seçin.' }]}>
            <Select placeholder="Şirket seçin" dropdownRender={(menu) => dropdownRender(menu, { singular: 'Şirket' })}>
              {renderOptions(companies, { singular: 'Şirket' })}
            </Select>
          </Form.Item>
          <Form.Item label="Bölge" name="region_id" rules={[{ required: true, message: 'Lütfen bir bölge seçin.' }]}>
            <Select placeholder="Bölge seçin" dropdownRender={(menu) => dropdownRender(menu, { singular: 'Bölge' })}>
              {renderOptions(regions, { singular: 'Bölge' })}
            </Select>
          </Form.Item>
          <Form.Item label="Hesap Adı" name="account_name_id" rules={[{ required: true, message: 'Lütfen bir hesap seçin.' }]}>
            <Select placeholder="Hesap seçin" dropdownRender={(menu) => dropdownRender(menu, { singular: 'Hesap Adı' })}>
              {renderOptions(accountNames, { singular: 'Hesap Adı' })}
            </Select>
          </Form.Item>
          <Form.Item label="Bütçe Kalemi" name="budget_item_id" rules={[{ required: true, message: 'Lütfen bir bütçe kalemi seçin.' }]}>
            <Select placeholder="Bütçe kalemi seçin" dropdownRender={(menu) => dropdownRender(menu, { singular: 'Bütçe Kalemi' })}>
              {renderOptions(budgetItems, { singular: 'Bütçe Kalemi' })}
            </Select>
          </Form.Item>
          
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
        />
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
        />
      </Modal>
    </>
  );
}
