import React, { useState, useEffect, useRef } from 'react';
import { Form, Input, Button, DatePicker, InputNumber, Select, message, Divider, Row, Col, Switch, Typography } from "antd";
import { UsergroupAddOutlined, RetweetOutlined } from '@ant-design/icons';
import dayjs from "dayjs";
import styles from '../../shared/Form.module.css';

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;

export default function TransactionForm({ config, onFinish, initialValues = {}, onCancel, isSaving = false }) {
  const [form] = Form.useForm();
  const [allOptions, setAllOptions] = useState({});
  const [filteredOptions, setFilteredOptions] = useState({});
  const [isGroupMode, setIsGroupMode] = useState(false);
  const isMounted = useRef(false);

  // 1. Fetch all data for every dropdown field just once
  useEffect(() => {
    const fetchAllData = async () => {
      const data = {};
      for (const field of config.form.fields) {
        try {
          data[field.name] = await field.service.getAll();
        } catch (error) {
          message.error(`${field.label} verileri yüklenirken bir hata oluştu.`);
          data[field.name] = [];
        }
      }
      setAllOptions(data);
    };
    fetchAllData();
  }, [config.form.fields]);

  // 2. Set up the form for either a new entry or editing an existing one
  useEffect(() => {
    // Only run this logic if we have all the data needed
    if (Object.keys(allOptions).length === 0) return;

    const newFilteredOptions = {};
    const initialFormValues = {
      date: dayjs(),
      repeat_count: 12,
      ...initialValues,
      date: initialValues.date ? dayjs(initialValues.date) : dayjs(),
    };

    // Populate IDs for the form
    config.form.fields.forEach(field => {
      const fieldNameWithoutId = field.name.replace('_id', '');
      if (initialValues[fieldNameWithoutId]) {
        initialFormValues[field.name] = initialValues[fieldNameWithoutId].id;
      }
    });

    // Set filtered options based on hierarchy
    config.form.fields.forEach(field => {
      if (field.parent) {
        const parentValue = initialFormValues[field.parent];
        const parentKeyInData = `${field.parent.replace('_id', '')}_id`;
        newFilteredOptions[field.name] = parentValue
          ? allOptions[field.name]?.filter(item => item[parentKeyInData] === parentValue)
          : [];
      } else {
        // Top-level fields have all options available
        newFilteredOptions[field.name] = allOptions[field.name];
      }
    });
    
    setFilteredOptions(newFilteredOptions);
    form.setFieldsValue(initialFormValues);
    isMounted.current = true;

  }, [allOptions, initialValues, config.form.fields, form]);


  // 3. Handle dynamic filtering when a user changes a selection
  const handleSelectChange = (changedFieldName, value) => {
    if (!isMounted.current) return;

    const fieldConfig = config.form.fields.find(f => f.name === changedFieldName);
    if (!fieldConfig?.child) return;

    let currentChildName = fieldConfig.child;
    const newFiltered = { ...filteredOptions };
    
    // Cascade through children, updating their options and resetting their values
    while (currentChildName) {
      const childConfig = config.form.fields.find(f => f.name === currentChildName);
      if (!childConfig) break;

      const parentKeyInData = `${childConfig.parent.replace('_id', '')}_id`;
      
      newFiltered[currentChildName] = value
        ? allOptions[currentChildName]?.filter(item => item[parentKeyInData] === value)
        : [];
      
      form.setFieldsValue({ [currentChildName]: null });

      // Move to the next child in the chain
      value = null; // Subsequent children should be cleared
      currentChildName = childConfig.child;
    }
    setFilteredOptions(newFiltered);
  };

  const handleFormSubmit = (values) => {
    const payload = {
      ...values,
      date: values.date ? values.date.format("YYYY-MM-DD") : null,
    };
    onFinish(payload, isGroupMode);
  };

  return (
    <div className={styles.formContainer}>
      <Form layout="vertical" form={form} onFinish={handleFormSubmit}>
        
        {!initialValues.id && (
          <Form.Item>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong>Tekrarlı {config.title.slice(0,-1)} Grubu Oluştur</Text>
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
                  <Input placeholder="Örn: Aylık Faturalar" prefix={<UsergroupAddOutlined />}/>
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
        
        <Divider orientation="left" plain>Detaylar</Divider>

        <Form.Item label="Açıklama" name="description" rules={[{ required: true, message: 'Lütfen bir açıklama girin.' }]}>
          <TextArea rows={3} placeholder={isGroupMode ? "Grup içindeki her kaydın ana açıklaması..." : "Açıklama..."}/>
        </Form.Item>
        
        <Row gutter={16}>
            <Col span={12}>
                <Form.Item label="Tutar" name={config.form.amountField} rules={[{ required: true, message: 'Lütfen tutarı girin.' }]}>
                  <InputNumber style={{ width: "100%" }} min={0} placeholder="0.00" addonAfter="₺"/>
                </Form.Item>
            </Col>
            <Col span={12}>
                <Form.Item label={isGroupMode ? `İlk ${config.title.slice(0,-1)} Tarihi` : config.form.dateLabel} name="date" rules={[{ required: true, message: 'Lütfen bir tarih seçin.' }]}>
                  <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                </Form.Item>
            </Col>
        </Row>

        <Divider orientation="left" plain>Kategorizasyon</Divider>

        {config.form.fields.map(field => (
          <Form.Item key={field.name} label={field.label} name={field.name} rules={[{ required: true, message: `Lütfen bir ${field.label.toLowerCase()} seçin.` }]}>
            <Select
              placeholder={`${field.label} seçin`}
              onChange={(value) => handleSelectChange(field.name, value)}
              disabled={field.parent && !form.getFieldValue(field.parent)}
              allowClear
            >
              {(filteredOptions[field.name] || []).map(item => (
                <Option key={item.id} value={item.id}>{item.name}</Option>
              ))}
            </Select>
          </Form.Item>
        ))}

        <div className={styles.formActions}>
          <Button onClick={onCancel} size="large" disabled={isSaving}>İptal</Button>
          <Button type="primary" htmlType="submit" size="large" loading={isSaving}>
            {isGroupMode ? 'Grubu Oluştur' : (initialValues.id ? 'Değişiklikleri Kaydet' : 'Kaydet')}
          </Button>
        </div>
      </Form>
    </div>
  );
}