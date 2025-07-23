import React, { useState, useEffect } from 'react';
import { Modal, Form, InputNumber, DatePicker, Collapse, Row, Col, Typography } from 'antd';
import dayjs from 'dayjs';

const { Panel } = Collapse;
const { Text } = Typography;

const DailyEntryModal = ({ visible, onCancel, onSave, allBankAccounts, selectedMonth }) => {
  const [form] = Form.useForm();
  const [selectedDate, setSelectedDate] = useState(dayjs()); // Başlangıçta bugünün tarihi

  useEffect(() => {
    if (visible) {
      form.resetFields();
      form.setFieldsValue({
        entryDate: selectedDate, // Modal açıldığında başlangıç tarihi bugün olsun
      });

      const initialValues = {};
      allBankAccounts.forEach(account => {
        initialValues[`sabah_${account.bankName}_${account.accountName}`] = null;
        initialValues[`aksam_${account.bankName}_${account.accountName}`] = null;
      });
      form.setFieldsValue(initialValues);
    }
  }, [visible, form, allBankAccounts, selectedDate]);

  const handleOk = () => {
    form.validateFields().then((values) => {
      const entryDate = dayjs(values.entryDate).format('DD.MM.YYYY');

      const entriesToSave = [];
      allBankAccounts.forEach(account => {
        const sabahKey = `sabah_${account.bankName}_${account.accountName}`;
        const aksamKey = `aksam_${account.bankName}_${account.accountName}`;

        if (values[sabahKey] !== null && values[sabahKey] !== undefined ||
            values[aksamKey] !== null && values[aksamKey] !== undefined) {
          entriesToSave.push({
            banka: account.bankName,
            hesap: account.accountName,
            tarih: entryDate,
            sabah: values[sabahKey] === null ? undefined : values[sabahKey],
            aksam: values[aksamKey] === null ? undefined : values[aksamKey],
          });
        }
      });
      onSave(entriesToSave);
      form.resetFields();
    });
  };

  // Gelecek tarihleri devre dışı bırakma fonksiyonu
  const disabledFutureDate = (current) => {
    // Sadece bugünden önceki tarihleri ve bugünü seçilebilir yapar
    return current && current > dayjs().endOf('day');
  };

  const groupedAccounts = allBankAccounts.reduce((acc, account) => {
    if (!acc[account.bankName]) {
      acc[account.bankName] = [];
    }
    acc[account.bankName].push(account);
    return acc;
  }, {});

  return (
    <Modal
      title="Günlük Giriş Ekle (Toplu)"
      visible={visible}
      onCancel={onCancel}
      onOk={handleOk}
      okText="Kaydet"
      cancelText="İptal"
      width={700}
      style={{ top: 50 }}
      maskClosable={false}
    >
      <Form layout="vertical" form={form}>
        <Form.Item name="entryDate" label="Giriş Tarihi" rules={[{ required: true, message: 'Lütfen bir tarih seçin!' }]}>
          <DatePicker
            style={{ width: '100%' }}
            format="DD.MM.YYYY"
            allowClear={false}
            onChange={(date) => setSelectedDate(date)}
            disabledDate={disabledFutureDate} // GELECEK TARİHLERİ DEVRE DIŞI BIRAKIR
          />
        </Form.Item>

        <Collapse defaultActiveKey={Object.keys(groupedAccounts)[0]} expandIconPosition="right">
          {Object.entries(groupedAccounts).map(([bankName, accounts]) => (
            <Panel header={<Text strong>{bankName}</Text>} key={bankName}>
              {accounts.map((account) => (
                <div key={`${account.bankName}-${account.accountName}`} className="account-entry-row">
                  <Row gutter={16} align="middle">
                    <Col span={8}>
                      <Text strong>{account.accountName}</Text>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        name={`sabah_${account.bankName}_${account.accountName}`}
                        label="Sabah"
                        initialValue={null}
                      >
                        <InputNumber
                          style={{ width: '100%' }}
                          min={0}
                          placeholder="Sabah Tutarı (₺)"
                          formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                          parser={value => value.replace(/\$\s?|(,*)/g, '')}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        name={`aksam_${account.bankName}_${account.accountName}`}
                        label="Akşam"
                        initialValue={null}
                      >
                        <InputNumber
                          style={{ width: '100%' }}
                          min={0}
                          placeholder="Akşam Tutarı (₺)"
                          formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                          parser={value => value.replace(/\$\s?|(,*)/g, '')}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </div>
              ))}
            </Panel>
          ))}
        </Collapse>
      </Form>
    </Modal>
  );
};

export default DailyEntryModal;