import React from 'react';
import { Modal, Form, Button, DatePicker, Select, InputNumber, Space } from 'antd';
import dayjs from 'dayjs';

// Bu dosya, orijinal DailyEntryModal.jsx'in kopyasıdır ve sadece "Risk" için uyarlanmıştır.
const KMHDailyEntryModal = ({ visible, onCancel, onSave, allBankAccounts, selectedMonth }) => {
  const [form] = Form.useForm();

  const handleSave = () => {
    form.validateFields().then(values => {
      const formattedEntries = values.entries.map(entry => ({
        ...entry,
        tarih: dayjs(entry.tarih).format('DD.MM.YYYY'),
        banka: entry.account.split('|')[0],
        hesap: entry.account.split('|')[1],
      }));
      onSave(formattedEntries);
      onCancel();
      form.resetFields();
    });
  };

  return (
    <Modal
      title="Günlük Risk Girişi" // Başlık değişti
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
                  <Form.Item {...restField} name={[name, 'tarih']} rules={[{ required: true, message: 'Tarih zorunludur' }]} initialValue={selectedMonth}>
                    <DatePicker format="DD.MM.YYYY" />
                  </Form.Item>
                  <Form.Item {...restField} name={[name, 'account']} rules={[{ required: true, message: 'Hesap zorunludur' }]} style={{minWidth: '200px'}}>
                    <Select placeholder="Banka / Hesap Seçin">
                      {allBankAccounts.map(acc => (
                        <Select.Option key={acc.id} value={`${acc.bankName}|${acc.accountName}`}>
                          {acc.bankName} - {acc.accountName}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item {...restField} name={[name, 'sabah']}>
                    <InputNumber placeholder="Sabah Riski" style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item {...restField} name={[name, 'aksam']}>
                    <InputNumber placeholder="Akşam Riski" style={{ width: '100%' }} />
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

export default KMHDailyEntryModal;
