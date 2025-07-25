import React from 'react';
import { Modal, Form, Button, DatePicker, Select, InputNumber, Space } from 'antd';
import dayjs from 'dayjs';

// Bu dosya, KMHDailyEntryModal.jsx'in kopyasıdır ve Kredi Kartı için uyarlanmıştır.
const CreditCardDailyEntryModal = ({ visible, onCancel, onSave, allCreditCards, selectedMonth }) => {
  const [form] = Form.useForm();

  const handleSave = () => {
    form.validateFields().then(values => {
      const formattedEntries = values.entries.map(entry => ({
        ...entry,
        tarih: dayjs(entry.tarih).format('DD.MM.YYYY'),
        banka: entry.card.split('|')[0],
        kart_adi: entry.card.split('|')[1],
        kart_numarasi: entry.card.split('|')[2],
      }));
      onSave(formattedEntries);
      onCancel();
      form.resetFields();
    });
  };

  return (
    <Modal
      title="Günlük Kullanılabilir Limit Girişi"
      visible={visible}
      onCancel={onCancel}
      onOk={handleSave}
      okText="Kaydet"
      cancelText="İptal"
      width={800}
      destroyOnClose
    >
      <Form form={form} initialValues={{ entries: [{}] }} autoComplete="off">
        <Form.List name="entries">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                  <Form.Item {...restField} name={[name, 'tarih']} rules={[{ required: true }]} initialValue={selectedMonth}>
                    <DatePicker format="DD.MM.YYYY" />
                  </Form.Item>
                  <Form.Item {...restField} name={[name, 'card']} rules={[{ required: true }]} style={{minWidth: '250px'}}>
                    <Select placeholder="Banka / Kart Seçin">
                      {allCreditCards.map(card => (
                        <Select.Option key={card.id} value={`${card.bank_name}|${card.card_name}|${card.card_number}`}>
                          {card.bank_name} - {card.card_name} ({card.card_number})
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item {...restField} name={[name, 'sabah']}>
                    <InputNumber placeholder="Sabah Kullanılabilir Limit" style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item {...restField} name={[name, 'aksam']}>
                    <InputNumber placeholder="Akşam Kullanılabilir Limit" style={{ width: '100%' }} />
                  </Form.Item>
                  <Button type="link" danger onClick={() => remove(name)}>Sil</Button>
                </Space>
              ))}
              <Form.Item>
                <Button type="dashed" onClick={() => add()} block>+ Yeni Satır Ekle</Button>
              </Form.Item>
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
};

export default CreditCardDailyEntryModal;
