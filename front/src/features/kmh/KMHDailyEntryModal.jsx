import React, { useState, useEffect } from 'react';
import { Modal, Form, InputNumber, DatePicker, Collapse, Row, Col, Typography, Spin, message, Empty, Button, Tooltip } from 'antd';
import { EditOutlined, LockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getDailyRisksForMonth, getKmhAccounts } from '../../api/KMHStatusService';

const { Panel } = Collapse;
const { Text } = Typography;

const KMHDailyEntryModal = ({ visible, onCancel, onSave, allKmhAccounts }) => {
  const [form] = Form.useForm();
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [existingEntries, setExistingEntries] = useState({});
  const [loading, setLoading] = useState(false);
  const [editingAccounts, setEditingAccounts] = useState([]);

  useEffect(() => {
    if (visible) {
      fetchDataForDate(selectedDate);
    }
  }, [visible, selectedDate]);

  const fetchDataForDate = async (date) => {
    setLoading(true);
    form.resetFields();
    form.setFieldsValue({ entryDate: date });
    setEditingAccounts([]);

    try {
      const year = date.year();
      const month = date.month() + 1;
      const allMonthRisks = await getDailyRisksForMonth(year, month);
      const dateString = date.format('YYYY-MM-DD');
      const entriesForDay = allMonthRisks.filter(entry => entry.entry_date === dateString);
      
      const entriesMap = {};
      const formValues = {};
      entriesForDay.forEach(entry => {
        const key = `${entry.bank_name}-${entry.kmh_name}`;
        entriesMap[key] = entry;
        formValues[`sabah_${key}`] = entry.morning_risk;
        formValues[`aksam_${key}`] = entry.evening_risk;
      });
      setExistingEntries(entriesMap);
      form.setFieldsValue(formValues);

    } catch (error) {
      message.error("Mevcut risk verileri çekilirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleOk = () => {
    form.validateFields().then((values) => {
      const entryDate = dayjs(values.entryDate).format('DD.MM.YYYY');
      const entriesToSave = [];
      allKmhAccounts.forEach(account => {
        const key = `${account.bank_name}-${account.name}`;
        const sabahKey = `sabah_${key}`;
        const aksamKey = `aksam_${key}`;
        if (values[sabahKey] != null || values[aksamKey] != null) {
          entriesToSave.push({
            banka: account.bank_name,
            hesap: account.name,
            tarih: entryDate,
            sabah: values[sabahKey],
            aksam: values[aksamKey],
          });
        }
      });
      onSave(entriesToSave);
      form.resetFields();
    });
  };

  const handleEditToggle = (accountKey) => {
    setEditingAccounts(prev => 
      prev.includes(accountKey) 
        ? prev.filter(key => key !== accountKey)
        : [...prev, accountKey]
    );
  };

  const disabledFutureDate = (current) => current && current > dayjs().endOf('day');

  const groupedAccounts = allKmhAccounts.reduce((acc, account) => {
    const bankName = account.bank_name;
    if (!acc[bankName]) acc[bankName] = [];
    acc[bankName].push(account);
    return acc;
  }, {});

  return (
    <Modal title="Günlük Risk Girişi (Toplu)" visible={visible} onCancel={onCancel} onOk={handleOk} okText="Kaydet" cancelText="İptal" width={700}>
      <Form layout="vertical" form={form}>
        <Form.Item name="entryDate" label="Giriş Tarihi" rules={[{ required: true }]}>
          <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" allowClear={false} onChange={setSelectedDate} disabledDate={disabledFutureDate} />
        </Form.Item>
        <Spin spinning={loading}>
          {Object.keys(groupedAccounts).length > 0 ? (
            <Collapse defaultActiveKey={Object.keys(groupedAccounts)} expandIconPosition="right">
              {Object.entries(groupedAccounts).map(([bankName, accountsInBank]) => (
                <Panel header={<Text strong>{bankName}</Text>} key={bankName}>
                  {accountsInBank.map((account) => {
                    const accountKey = `${account.bank_name}-${account.name}`;
                    const hasExistingData = !!existingEntries[accountKey];
                    const isEditing = editingAccounts.includes(accountKey);
                    const isDisabled = hasExistingData && !isEditing;

                    return (
                      <Row key={account.id} gutter={16} align="middle" style={{ marginBottom: '8px' }}>
                        <Col span={6}><Text>{account.name}</Text></Col>
                        <Col span={7}><Form.Item name={`sabah_${accountKey}`} noStyle><InputNumber disabled={isDisabled} style={{ width: '100%' }} placeholder="Sabah Riski" /></Form.Item></Col>
                        <Col span={7}><Form.Item name={`aksam_${accountKey}`} noStyle><InputNumber disabled={isDisabled} style={{ width: '100%' }} placeholder="Akşam Riski" /></Form.Item></Col>
                        <Col span={4} style={{ textAlign: 'right' }}>
                          {hasExistingData && (
                            <Tooltip title={isEditing ? 'Kilitle' : 'Düzenle'}>
                              <Button
                                icon={isEditing ? <LockOutlined /> : <EditOutlined />}
                                onClick={() => handleEditToggle(accountKey)}
                              />
                            </Tooltip>
                          )}
                        </Col>
                      </Row>
                    );
                  })}
                </Panel>
              ))}
            </Collapse>
          ) : (
            !loading && <Empty description="Giriş yapılabilecek KMH hesabı bulunmuyor." />
          )}
        </Spin>
      </Form>
    </Modal>
  );
};

export default KMHDailyEntryModal;
