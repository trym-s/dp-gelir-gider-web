// front/src/features/components/IncomeForm.jsx

import React, { useState, useEffect } from 'react';
import { Form, Input, Button, DatePicker, InputNumber, Select, Modal, message, Divider, Row, Col } from "antd";
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from "dayjs";
import { customerService } from '../../../api/customerService';
import { regionService } from '../../../api/regionService';
import { accountNameService } from '../../../api/accountNameService';
import { budgetItemService } from '../../../api/budgetItemService';
import CustomerFormModal from '../../management/CustomerFormModal.jsx';
import styles from '../../shared/Form.module.css';

const { TextArea } = Input;
const { Option } = Select;

export default function GelirForm({ onFinish, initialValues = {}, onCancel }) {
  const [form] = Form.useForm();

  const [customers, setCustomers] = useState([]);
  const [regions, setRegions] = useState([]);
  const [accountNames, setAccountNames] = useState([]);
  const [budgetItems, setBudgetItems] = useState([]);

  const [isCustomerModalVisible, setIsCustomerModalVisible] = useState(false);
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [newEntityName, setNewEntityName] = useState('');
  const [newEntityType, setNewEntityType] = useState({ singular: '' });
  const [isEditNameModalVisible, setIsEditNameModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [updatedName, setUpdatedName] = useState('');

  const isEditing = !!initialValues?.id;
  const hasReceipts = isEditing && initialValues?.received_amount > 0;

  const fetchAllDropdownData = async () => {
    try {
      const [customersData, regionsData, accountNamesData, budgetItemsData] = await Promise.all([
        customerService.getAll(),
        regionService.getAll(),
        accountNameService.getAll(),
        budgetItemService.getAll()
      ]);
      setCustomers(customersData);
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

  useEffect(() => {
    if (initialValues && initialValues.id) {
      const formValues = {
        ...initialValues,
        issue_date: initialValues.issue_date ? dayjs(initialValues.issue_date) : null,
        due_date: initialValues.due_date ? dayjs(initialValues.due_date) : null,
        customer_id: initialValues.customer?.id,
        region_id: initialValues.region?.id,
        account_name_id: initialValues.account_name?.id,
        budget_item_id: initialValues.budget_item?.id,
        currency: initialValues.currency || 'TRY',
      };
      form.setFieldsValue(formValues);
    }
  }, [form, initialValues]);

  const handleFormSubmit = (values) => {
    const allFormValues = form.getFieldsValue();
    const payload = {
      id: initialValues.id,
      ...allFormValues,
      issue_date: allFormValues.issue_date ? dayjs(allFormValues.issue_date).format("YYYY-MM-DD") : null,
      due_date: values.due_date ? dayjs(values.due_date).format("YYYY-MM-DD") : null,
      total_amount: allFormValues.total_amount ? parseFloat(allFormValues.total_amount) : null,
    };
    onFinish(payload);
  };

  const handleCustomerCreateSuccess = (newCustomer) => {
    setIsCustomerModalVisible(false);
    fetchAllDropdownData();
    form.setFieldsValue({ customer_id: newCustomer.id });
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
        createdEntity = await regionService.create(entityData);
        await fetchAllDropdownData();
        form.setFieldsValue({ region_id: createdEntity.id });
      } else if (type === 'Hesap Adı') {
        createdEntity = await accountNameService.create(entityData);
        await fetchAllDropdownData();
        form.setFieldsValue({ account_name_id: createdEntity.id });
      } else if (type === 'Bütçe Kalemi') {
        createdEntity = await budgetItemService.create(entityData);
        await fetchAllDropdownData();
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
      const updateData = { name: updatedName };
      const { type, id } = editingItem;

      if (type === 'Müşteri') await customerService.update(id, updateData);
      else if (type === 'Bölge') await regionService.update(id, updateData);
      else if (type === 'Hesap Adı') await accountNameService.update(id, updateData);
      else if (type === 'Bütçe Kalemi') await budgetItemService.update(id, updateData);

      message.success(`${type} başarıyla güncellendi.`);
      setIsEditNameModalVisible(false);
      await fetchAllDropdownData();

    } catch (error) {
      message.error(error.response?.data?.error || "Güncelleme sırasında bir hata oluştu.");
    }
  };

  const renderOptions = (items, type) => {
    return (items || []).map(item => (
      <Option key={item.id} value={item.id} label={item.name}>
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
        <Button
          type="text"
          icon={<PlusOutlined />}
          onClick={() => {
            if (type.singular === 'Müşteri') {
              setIsCustomerModalVisible(true);
            } else {
              showCreateModal(type);
            }
          }}
        >
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
          <Form.Item
            label="Fatura İsmi"
            name="invoice_name"
            tooltip="Faturada görünecek başlık. Örn: Aylık Danışmanlık Hizmeti."
            extra="En az 3 karakter olacak şekilde net ve ayırt edici bir başlık girin."
            rules={[{ required: true, message: 'Lütfen bir fatura ismi girin.' }]}
          >
            <TextArea rows={2} placeholder="Örn: Aylık Danışmanlık Hizmeti" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="Fatura Numarası"
                name="invoice_number"
                tooltip="Şirket içi veya ERP numarası. Tekil olmalıdır."
                extra="Örn: DP-2025-001"
                rules={[{ required: true, message: 'Lütfen bir fatura numarası girin.' }]}
              >
                <Input placeholder="Örn: DP-2025-001" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Toplam Tutar"
                name="total_amount"
                tooltip={hasReceipts ? "Bu gelire tahsilat girildiği için toplam tutar değiştirilemez." : "KDV dahil toplam tutar. Sadece sayı girin; para birimini sağdaki kutudan seçin."}
                extra="Ondalık için nokta kullanın. Örn: 1250.50"
                rules={[{ required: true, message: 'Lütfen bir tutar girin.' }]}
              >
                <InputNumber
                  disabled={hasReceipts}
                  style={{ width: "100%" }}
                  min={0}
                  placeholder="0.00"
                  addonAfter={
                    <Form.Item name="currency" noStyle>
                      <Select style={{ width: 85 }} disabled={hasReceipts}>
                        <Option value="TRY">₺ TRY</Option>
                        <Option value="USD">$ USD</Option>
                        <Option value="EUR">€ EUR</Option>
                        <Option value="AED">AED</Option>
                        <Option value="GBP">£ GBP</Option>
                      </Select>
                    </Form.Item>
                  }
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Düzenleme Tarihi"
                name="issue_date"
                tooltip="Faturanın düzenlendiği tarih."
                extra="Format: GG/AA/YYYY"
                rules={[{ required: true, message: 'Lütfen bir tarih seçin.' }]}
              >
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="due_date" label="Vade Tarihi">
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
          <Divider orientation="left" plain>Kategorizasyon</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Müşteri"
                name="customer_id"
                tooltip="Gelirin ilişkilendirileceği müşteri."
                extra="Listede yoksa açılır menünün altında 'Yeni Müşteri Ekle' ile oluşturabilirsiniz."
                rules={[{ required: true, message: 'Lütfen bir müşteri seçin.' }]}
              >
                <Select
                  placeholder="Müşteri seçin"
                  dropdownRender={(menu) => dropdownRender(menu, { singular: 'Müşteri' })}
                  showSearch
                  filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                >
                  {renderOptions(customers, { singular: 'Müşteri' })}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Bölge"
                name="region_id"
                tooltip="Gelirin bağlı olduğu iş/bölge."
                extra="Örn: Türkiye, Dubai, Avrupa vb."
                rules={[{ required: true, message: 'Lütfen bir bölge seçin.' }]}
              >
                <Select
                  placeholder="Bölge seçin"
                  dropdownRender={(menu) => dropdownRender(menu, { singular: 'Bölge' })}
                  showSearch
                  filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                >
                  {renderOptions(regions, { singular: 'Bölge' })}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Hesap Adı"
                name="account_name_id"
                tooltip="Gelirin muhasebe/raporlama hesabı."
                extra="Örn: Hizmet Gelirleri, Satış Gelirleri vb."
                rules={[{ required: true, message: 'Lütfen bir hesap seçin.' }]}
              >
                <Select
                  placeholder="Hesap adı seçin"
                  dropdownRender={(menu) => dropdownRender(menu, { singular: 'Hesap Adı' })}
                  showSearch
                  filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                >
                  {renderOptions(accountNames, { singular: 'Hesap Adı' })}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Bütçe Kalemi"
                name="budget_item_id"
                tooltip="Bütçe takip kategorisi."
                extra="Örn: Proje Geliri, Abonelik Geliri vb."
                rules={[{ required: true, message: 'Lütfen bir bütçe kalemi seçin.' }]}
              >
                <Select
                  placeholder="Bütçe kalemi seçin"
                  dropdownRender={(menu) => dropdownRender(menu, { singular: 'Bütçe Kalemi' })}
                  showSearch
                  filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                >
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

      <CustomerFormModal
        visible={isCustomerModalVisible}
        onCancel={() => setIsCustomerModalVisible(false)}
        onSuccess={handleCustomerCreateSuccess}
      />

      <Modal
        title={`Yeni ${newEntityType.singular} Ekle`}
        open={isCreateModalVisible}
        onOk={handleCreateEntity}
        onCancel={() => {
            setCreateModalVisible(false);
            setNewEntityName('');
        }}
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