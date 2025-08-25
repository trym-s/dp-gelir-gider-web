// front/src/management/CustomerFormModal.jsx

import React, { useEffect } from 'react';
import { Modal, Form, Input, message } from 'antd';
import { customerService } from '../../api/customerService';

const CustomerFormModal = ({ visible, onCancel, onSuccess, initialValues }) => {
  const [form] = Form.useForm();
  const isEditing = !!initialValues?.id;

  // Modal açıldığında veya initialValues değiştiğinde formu doldurur
  useEffect(() => {
    if (visible) {
      if (isEditing) {
        form.setFieldsValue(initialValues);
      } else {
        form.resetFields();
      }
    }
  }, [visible, initialValues, form, isEditing]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      let response;

      if (isEditing) {
        response = await customerService.update(initialValues.id, values);
        message.success('Müşteri başarıyla güncellendi.');
      } else {
        // ÖNEMLİ: Backend'in standart ekleme modunu kullanması için 'source' göndermiyoruz.
        response = await customerService.create(values);
        message.success('Müşteri başarıyla oluşturuldu.');
      }
      onSuccess(response); // Parent component'e başarılı sonucu bildir
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'İşlem sırasında bir hata oluştu.';
      message.error(errorMsg);
    }
  };

  return (
    <Modal
      title={isEditing ? 'Müşteri Düzenle' : 'Yeni Müşteri Ekle'}
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      okText="Kaydet"
      cancelText="İptal"
      destroyOnClose
    >
      <Form form={form} layout="vertical" name="customer_form">
        <Form.Item
          name="name"
          label="Müşteri Adı"
          rules={[{ required: true, message: 'Lütfen müşteri adını girin!' }]}
        >
          <Input placeholder="Örn: ABC Teknoloji A.Ş." />
        </Form.Item>
        <Form.Item
          name="tax_number"
          label="Vergi Numarası"
          rules={[{ required: true, message: 'Lütfen vergi numarasını girin!' }]}
        >
          <Input placeholder="Örn: 1234567890" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CustomerFormModal;