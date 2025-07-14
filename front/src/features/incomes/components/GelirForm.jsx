import React, { useState, useEffect, useRef } from 'react';
import { Form, Input, Button, DatePicker, InputNumber, Select, Space, Modal, message, Divider, Row, Col } from "antd";
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from "dayjs";
import { getCompanies, createCompany, updateCompany } from '../../../api/companyService';
import { getRegions, createRegion, updateRegion } from '../../../api/regionService';
import { getAccountNames, createAccountName, updateAccountName } from '../../../api/accountNameService';
import { getBudgetItems, createBudgetItem, updateBudgetItem } from '../../../api/budgetItemService';

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

  // Klavye navigasyonu için ref'ler
  const inputRefs = useRef([]);
  const formContainerRef = useRef(null);

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

  // Klavye navigasyonunu yöneten useEffect
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Enter' || event.key === 'Tab') {
        const activeElement = document.activeElement;
        const currentIndex = inputRefs.current.findIndex(ref => ref.current?.input === activeElement || ref.current?.focus?.toString().includes('native'));
        
        if (currentIndex !== -1 && currentIndex < inputRefs.current.length - 1) {
          event.preventDefault();
          const nextInput = inputRefs.current[currentIndex + 1];
          nextInput.current?.focus();
        }
      }
    };
    
    const formElement = formContainerRef.current;
    if (formElement) {
        formElement.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      if (formElement) {
        formElement.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [inputRefs, formContainerRef]);

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{item.name}</span>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={(e) => showEditNameModal(item, type.singular, e)}
          />
        </div>
      </Option>
    ));
  };

  return (
    <>
      <div ref={formContainerRef}>
        <Form layout="vertical" form={form} onFinish={handleFormSubmit} initialValues={processedInitialValues}>
          
          <Divider orientation="left" plain>Gelir Detayları</Divider>
          
          <Form.Item label="Açıklama" name="description" rules={[{ required: true, message: 'Lütfen bir açıklama girin.' }]}>
            <TextArea ref={el => inputRefs.current[0] = el} rows={3} placeholder="Gelirin açıklaması..."/>
          </Form.Item>

          <Row gutter={16}>
              <Col span={12}>
                  <Form.Item label="Tutar" name="total_amount" rules={[{ required: true, message: 'Lütfen bir tutar girin.' }]}>
                    <InputNumber ref={el => inputRefs.current[1] = el} style={{ width: "100%" }} min={0} placeholder="0.00" addonAfter="₺" />
                  </Form.Item>
              </Col>
              <Col span={12}>
                  <Form.Item label="Tarih" name="date" rules={[{ required: true, message: 'Lütfen bir tarih seçin.' }]}>
                    <DatePicker ref={el => inputRefs.current[2] = el} style={{ width: "100%" }} format="DD/MM/YYYY" />
                  </Form.Item>
              </Col>
          </Row>

          <Divider orientation="left" plain>Kategorizasyon</Divider>

          <Form.Item label="Şirket" name="company_id" rules={[{ required: true, message: 'Lütfen bir şirket seçin.' }]}>
            <Select
              ref={el => inputRefs.current[3] = el}
              placeholder="Şirket seçin veya yeni oluşturun"
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: '8px 0' }} />
                  <Button type="text" icon={<PlusOutlined />} onClick={() => showCreateModal({ singular: 'Şirket' })}>
                    Yeni Şirket Ekle
                  </Button>
                </>
              )}
            >
              {renderOptions(companies, { singular: 'Şirket' })}
            </Select>
          </Form.Item>
          <Form.Item label="Bölge" name="region_id" rules={[{ required: true, message: 'Lütfen bir bölge seçin.' }]}>
            <Select
              ref={el => inputRefs.current[4] = el}
              placeholder="Bölge seçin veya yeni oluşturun"
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: '8px 0' }} />
                  <Button type="text" icon={<PlusOutlined />} onClick={() => showCreateModal({ singular: 'Bölge' })}>
                    Yeni Bölge Ekle
                  </Button>
                </>
              )}
            >
              {renderOptions(regions, { singular: 'Bölge' })}
            </Select>
          </Form.Item>
          <Form.Item label="Hesap Adı" name="account_name_id" rules={[{ required: true, message: 'Lütfen bir hesap seçin.' }]}>
            <Select
              ref={el => inputRefs.current[5] = el}
              placeholder="Hesap seçin veya yeni oluşturun"
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: '8px 0' }} />
                  <Button type="text" icon={<PlusOutlined />} onClick={() => showCreateModal({ singular: 'Hesap Adı' })}>
                    Yeni Hesap Ekle
                  </Button>
                </>
              )}
            >
              {renderOptions(accountNames, { singular: 'Hesap Adı' })}
            </Select>
          </Form.Item>
          <Form.Item label="Bütçe Kalemi" name="budget_item_id" rules={[{ required: true, message: 'Lütfen bir bütçe kalemi seçin.' }]}>
            <Select
              ref={el => inputRefs.current[6] = el}
              placeholder="Bütçe kalemi seçin veya yeni oluşturun"
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: '8px 0' }} />
                  <Button type="text" icon={<PlusOutlined />} onClick={() => showCreateModal({ singular: 'Bütçe Kalemi' })}>
                    Yeni Bütçe Kalemi Ekle
                  </Button>
                </>
              )}
            >
              {renderOptions(budgetItems, { singular: 'Bütçe Kalemi' })}
            </Select>
          </Form.Item>
          
          <Form.Item>
            <Space style={{ width: "100%", justifyContent: "flex-end", marginTop: '16px' }}>
              <Button onClick={onCancel} size="large">İptal</Button>
              <Button type="primary" htmlType="submit" size="large">
                {initialValues.id ? 'Değişiklikleri Kaydet' : 'Geliri Kaydet'}
              </Button>
            </Space>
          </Form.Item>
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