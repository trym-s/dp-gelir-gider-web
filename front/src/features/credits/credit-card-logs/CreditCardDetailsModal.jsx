import React, { useState } from 'react';
import { Modal, Typography, Button, message, Tag, Space, Statistic, Divider, Row, Col, Form, Select, DatePicker, Input } from 'antd';
import { SwapOutlined, CheckCircleOutlined, StopOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import { saveCreditCardStatus } from "../../../api/creditCardService";
import CardBrandIcon from '../credit-cards/components/CardBrandIcon';

import "./CreditCardDetailsModal.css";

const { Text, Title } = Typography;
const { Option } = Select;

const formatCurrency = (value) => {
    if (value == null || isNaN(parseFloat(value))) return '₺0,00';
    return parseFloat(value).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
};

const formatCardNumber = (number) => {
    if (!number || typeof number !== 'string') return '**** **** **** ****';
    return number.replace(/(\d{4})/g, '$1 ').trim();
};

const CreditCardDetailsModal = ({ visible, onCancel, card, onDataUpdate }) => {
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [form] = Form.useForm();

  if (!card) return null;

  const statusConfig = {
    'Aktif': { color: 'success', text: 'Aktif', icon: <CheckCircleOutlined /> },
    'Pasif': { color: 'error', text: 'Pasif', icon: <StopOutlined /> },
    'Bloke': { color: 'warning', text: 'Bloke', icon: <ExclamationCircleOutlined /> }
  };

  const cardRealStatus = card.status || 'Aktif'; 
  const currentStatus = statusConfig[cardRealStatus];

  const openChangeStatusModal = () => {
    form.setFieldsValue({
        status: null,
        start_date: dayjs(),
        end_date: null,
        reason: ''
    });
    setIsStatusModalOpen(true);
  };

  const closeChangeStatusModal = () => {
    setIsStatusModalOpen(false);
  };

  const handleSaveStatus = (values) => {
    const payload = {
      subject_id: card.id,
      subject_type: 'credit_card',
      status: values.status,
      start_date: values.start_date.format('YYYY-MM-DD'),
      end_date: values.end_date ? values.end_date.format('YYYY-MM-DD') : null,
      reason: values.reason,
    };

    saveCreditCardStatus(payload)
      .then(() => {
        message.success('Kredi kartı durumu başarıyla güncellendi!');
        closeChangeStatusModal();
        if (onDataUpdate) {
          onDataUpdate();
        }
        onCancel();
      })
      .catch((error) => {
        console.error("Durum güncellenirken bir hata oluştu:", error);
        message.error("Durum güncellenirken bir hata oluştu.");
      });
  };

  return (
    <>
      <Modal
        open={visible}
        onCancel={onCancel}
        footer={null}
        width={550}
        className="modern-card-details-modal"
        title="Kart Detayları"
        centered
      >
        <div className="card-visual">
          <div className="card-visual-header">
            <Text className="bank-name-visual">{card.bank_name || card.bank_account?.bank.name}</Text>
            <CardBrandIcon brand={card.card_brand} style={{ fontSize: '2.5rem', color: 'rgba(255, 255, 255, 0.8)' }} />
          </div>
          <div className="card-number-visual">
            <Text>{formatCardNumber(card.credit_card_no)}</Text>
          </div>
          <div className="card-visual-footer">
            <div className="card-holder">
              <Text className="label">Kart Sahibi</Text>
              <Text className="value">{card.name}</Text>
            </div>
            <div className="card-expiry">
              <Text className="label">SKT</Text>
              <Text className="value">{dayjs(card.expiration_date, 'MM/YY').format('MM/YY')}</Text>
            </div>
          </div>
        </div>
        <Row gutter={[16, 16]} className="financial-summary">
          <Col span={8}>
            <Statistic title="Toplam Limit" value={card.limit} formatter={formatCurrency} />
          </Col>
          <Col span={8}>
            <Statistic title="Kullanılabilir Limit" value={card.available_limit || 0} formatter={formatCurrency} valueStyle={{ color: '#3f8600' }} />
          </Col>
          <Col span={8}>
            <Statistic title="Güncel Borç" value={card.current_debt || 0} formatter={formatCurrency} valueStyle={{ color: '#cf1322' }} />
          </Col>
        </Row>
        <Divider />
        <div className="actions-footer">
          <div className="status-info">
            <Text type="secondary">Güncel Durum:</Text>
            <Tag icon={currentStatus.icon} color={currentStatus.color}>{currentStatus.text}</Tag>
          </div>
          <Button
            type="primary"
            ghost
            icon={<SwapOutlined />}
            onClick={openChangeStatusModal}
            className="status-change-button-aesthetic"
          >
            Durum Değiştir
          </Button>
        </div>
      </Modal>

      <Modal
        open={isStatusModalOpen}
        title="Kredi Kartı Durumunu Değiştir"
        onCancel={closeChangeStatusModal}
        destroyOnClose
        footer={[
          <Button key="back" onClick={closeChangeStatusModal}>
            İptal
          </Button>,
          <Button key="submit" type="primary" onClick={() => form.submit()}>
            Kaydet
          </Button>,
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          name="status_change_form_in_details"
          onFinish={handleSaveStatus}
        >
          <Form.Item label="Önceki Durum">
            <Tag
              icon={currentStatus.icon}
              color={currentStatus.color}
              style={{ padding: '5px 10px', fontSize: '14px' }}
            >
              {currentStatus.text}
            </Tag>
          </Form.Item>
          <Form.Item
            name="status"
            label="Yeni Durum"
            rules={[{ required: true, message: 'Lütfen yeni durumu seçin!' }]}
          >
            <Select placeholder="Yeni durumu seçin">
              <Option value="Aktif">Aktif</Option>
              <Option value="Pasif">Pasif</Option>
              <Option value="Bloke">Bloke</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="start_date"
            label="Başlangıç Tarihi"
            rules={[{ required: true, message: 'Lütfen başlangıç tarihini seçin!' }]}
          >
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item
            name="end_date"
            label="Bitiş Tarihi (Opsiyonel)"
          >
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item
            name="reason"
            label="Neden (Opsiyonel)"
          >
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default CreditCardDetailsModal;