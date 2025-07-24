import React, { useState, useEffect } from 'react';
import { Modal, Form, InputNumber, DatePicker, Collapse, Row, Col, Typography, Spin, message, Empty, Button, Tooltip } from 'antd';
import { EditOutlined, LockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getDailyBalances, getAccounts } from '../../api/bankStatusService';

const { Panel } = Collapse;
const { Text } = Typography;

const DailyEntryModal = ({ visible, onCancel, onSave }) => {
  const [form] = Form.useForm();
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [availableAccounts, setAvailableAccounts] = useState([]);
  const [existingEntries, setExistingEntries] = useState([]); 
  const [loading, setLoading] = useState(false);
  
  // --- GERİ EKLENDİ: Düzenleme modundaki hesapları tutan state ---
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
    setAvailableAccounts([]);
    setEditingAccounts([]); // Tarih değiştiğinde düzenleme modlarını sıfırla

    try {
      const [accountsForDay, monthEntries] = await Promise.all([
        getAccounts(date),
        getDailyBalances(date.year(), date.month() + 1)
      ]);

      setAvailableAccounts(accountsForDay);
      
      const dateString = date.format('YYYY-MM-DD');
      const entriesForDay = monthEntries.filter(entry => entry.entry_date === dateString);
      setExistingEntries(entriesForDay);

      if (entriesForDay.length > 0) {
        const formValues = {};
        entriesForDay.forEach(entry => {
          formValues[`sabah_${entry.bank_name}_${entry.account_name}`] = entry.morning_balance;
          formValues[`aksam_${entry.bank_name}_${entry.account_name}`] = entry.evening_balance;
        });
        form.setFieldsValue(formValues);
      }
    } catch (error) {
      message.error("Veriler çekilirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleOk = () => {
    form.validateFields().then((values) => {
      const entryDate = dayjs(values.entryDate).format('DD.MM.YYYY');
      const entriesToSave = [];
      availableAccounts.forEach(account => {
        const sabahKey = `sabah_${account.bank_name}_${account.name}`;
        const aksamKey = `aksam_${account.bank_name}_${account.name}`;
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

  // --- GERİ EKLENDİ: Düzenleme modunu değiştiren fonksiyon ---
  const handleEditToggle = (accountId) => {
    setEditingAccounts(prev => 
      prev.includes(accountId) 
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const disabledFutureDate = (current) => current && current > dayjs().endOf('day');

  const groupedAccounts = availableAccounts.reduce((acc, account) => {
    const bankName = account.bank_name;
    if (!acc[bankName]) acc[bankName] = [];
    acc[bankName].push({ id: account.id, accountName: account.name, bankName: bankName });
    return acc;
  }, {});

  return (
    <Modal title="Günlük Giriş Ekle (Toplu)" visible={visible} onCancel={onCancel} onOk={handleOk} okText="Kaydet" cancelText="İptal" width={700}>
      <Form layout="vertical" form={form}>
        <Form.Item name="entryDate" label="Giriş Tarihi" rules={[{ required: true, message: 'Lütfen bir tarih seçin!' }]}>
          <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" allowClear={false} onChange={setSelectedDate} disabledDate={disabledFutureDate} />
        </Form.Item>
        
        <Spin spinning={loading}>
          {availableAccounts.length > 0 ? (
            <Collapse defaultActiveKey={Object.keys(groupedAccounts)} expandIconPosition="right">
              {Object.entries(groupedAccounts).map(([bankName, accounts]) => (
                <Panel header={<Text strong>{bankName}</Text>} key={bankName}>
                  {accounts.map((account) => {
                    // --- GERİ EKLENDİ: Hesaba özel kilit/düzenleme durumu kontrolü ---
                    const hasExistingData = existingEntries.some(e => e.account_name === account.accountName && e.bank_name === account.bankName);
                    const isEditing = editingAccounts.includes(account.id);
                    const isDisabled = hasExistingData && !isEditing;

                    return (
                      <Row key={account.id} gutter={16} align="middle">
                        <Col span={6}><Text>{account.accountName}</Text></Col>
                        <Col span={7}><Form.Item name={`sabah_${bankName}_${account.accountName}`} label="Sabah" style={{ marginBottom: 0 }}><InputNumber disabled={isDisabled} style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={7}><Form.Item name={`aksam_${bankName}_${account.accountName}`} label="Akşam" style={{ marginBottom: 0 }}><InputNumber disabled={isDisabled} style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={4} style={{ textAlign: 'right' }}>
                          {/* --- GERİ EKLENDİ: Düzenle/Kilitle butonu --- */}
                          {hasExistingData && (
                            <Tooltip title={isEditing ? 'Kilitle' : 'Düzenle'}>
                              <Button
                                icon={isEditing ? <LockOutlined /> : <EditOutlined />}
                                onClick={() => handleEditToggle(account.id)}
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
            !loading && <Empty description="Seçilen tarihte giriş yapılabilecek aktif hesap bulunmuyor." />
          )}
        </Spin>
      </Form>
    </Modal>
  );
};

export default DailyEntryModal;