import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Form, InputNumber, DatePicker, Collapse, Row, Col, Typography, Spin, message, Empty, Button, Tooltip } from 'antd';
import { EditOutlined, LockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getDailyRisksForMonth } from '../../api/KMHStatusService';

const { Panel } = Collapse;
const { Text } = Typography;

const KMHDailyEntryModal = ({ visible, onCancel, onSave, allKmhAccounts }) => {
  const [form] = Form.useForm();
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [existingEntries, setExistingEntries] = useState(new Map());
  const [loading, setLoading] = useState(false);
  const [editingAccounts, setEditingAccounts] = useState([]);

  const fetchDataForDate = useCallback(async (date) => {
    setLoading(true);
    form.resetFields();
    form.setFieldsValue({ entryDate: date });
    setEditingAccounts([]);

    try {
      const year = date.year();
      const month = date.month() + 1;
      const allMonthRisks = await getDailyRisksForMonth(year, month);
      const dateString = date.format('YYYY-MM-DD');
      
      const entriesForDay = allMonthRisks.filter(entry => dayjs(entry.entry_date).format('YYYY-MM-DD') === dateString);
      
      const entriesMap = new Map(entriesForDay.map(entry => [entry.kmh_limit_id, entry]));
      setExistingEntries(entriesMap);
      
      const formValues = {};
      allKmhAccounts.forEach(account => {
          const existingEntry = entriesMap.get(account.id);
          if(existingEntry) {
              const key = `${account.bank_name}-${account.name}`;
              formValues[`sabah_${key}`] = existingEntry.morning_risk;
              formValues[`aksam_${key}`] = existingEntry.evening_risk;
          }
      });
      form.setFieldsValue(formValues);

    } catch (error) {
      message.error("Mevcut risk verileri çekilirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [form, allKmhAccounts]);
  
  useEffect(() => {
    if (visible) {
      fetchDataForDate(selectedDate);
    }
  }, [visible, selectedDate, fetchDataForDate]);


  // ### DEĞİŞİKLİK BURADA: filteredAccounts listesi hesaplamasını render'ın içine taşıdık ###
  // Bu, selectedDate her değiştiğinde listenin yeniden hesaplanmasını sağlar.
  const filteredAccounts = allKmhAccounts.filter(account => {
    if (account.status === "Aktif" || !account.status) {
      return true;
    }
    if (!account.status_start_date) {
      return false; // Başlangıç tarihi yoksa güvenlik için gösterme
    }
    const statusStartDate = dayjs(account.status_start_date);
    // Seçilen tarih, durum başlangıç tarihinden ÖNCE ise hesabı göster.
    return selectedDate.isBefore(statusStartDate, 'day');
  });

  const handleOk = () => {
    form.validateFields().then((values) => {
      const entryDate = dayjs(values.entryDate).format('DD.MM.YYYY');
      const entriesToSave = [];
      
      // ### DEĞİŞİKLİK BURADA: `allKmhAccounts` yerine `filteredAccounts` kullanıyoruz ###
      // Sadece ekranda görünen (filtrelenmiş) hesaplar için veri kaydetmeye çalış.
      filteredAccounts.forEach(account => {
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
      form.setFieldsValue({ entryDate: selectedDate });
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
  
  // ### DEĞİŞİKLİK BURADA: `allKmhAccounts` yerine `filteredAccounts` kullanıyoruz ###
  // Hesapları gruplarken sadece filtrelenmiş olanları dikkate al.
  const groupedAccounts = filteredAccounts.reduce((acc, account) => {
    const bankName = account.bank_name;
    if (!acc[bankName]) acc[bankName] = [];
    acc[bankName].push(account);
    return acc;
  }, {});

  return (
    <Modal title="Günlük Risk Girişi (Toplu)" open={visible} onCancel={onCancel} onOk={handleOk} okText="Kaydet" cancelText="İptal" width={700} destroyOnClose>
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
                    const existingEntry = existingEntries.get(account.id);
                    const accountKey = `${account.bank_name}-${account.name}`;
                    const isEditing = editingAccounts.includes(accountKey);
                    
                    const hasSabahData = existingEntry && (existingEntry.morning_risk !== null && existingEntry.morning_risk !== undefined);
                    const hasAksamData = existingEntry && (existingEntry.evening_risk !== null && existingEntry.evening_risk !== undefined);
                    const isSabahDisabled = hasSabahData && !isEditing;
                    const isAksamDisabled = hasAksamData && !isEditing;
                    const showEditButton = hasSabahData || hasAksamData;

                    return (
                      <Row key={account.id} gutter={16} align="middle" style={{ marginBottom: '8px' }}>
                        <Col span={6}><Text>{account.name}</Text></Col>
                        <Col span={7}>
                          <Form.Item name={`sabah_${accountKey}`} noStyle>
                            <InputNumber disabled={isSabahDisabled} style={{ width: '100%' }} placeholder="Sabah Riski" />
                          </Form.Item>
                        </Col>
                        <Col span={7}>
                          <Form.Item name={`aksam_${accountKey}`} noStyle>
                            <InputNumber disabled={isAksamDisabled} style={{ width: '100%' }} placeholder="Akşam Riski" />
                          </Form.Item>
                        </Col>
                        <Col span={4} style={{ textAlign: 'right' }}>
                          {showEditButton && (
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
            !loading && <Empty description="Seçilen tarih için giriş yapılabilecek aktif KMH hesabı bulunmuyor." />
          )}
        </Spin>
      </Form>
    </Modal>
  );
};

export default KMHDailyEntryModal;