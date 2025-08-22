// src/features/current_status/DailyEntryModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Form, InputNumber, DatePicker, Collapse, Row, Col, Typography, Spin, message, Empty, Button, Tooltip } from 'antd';
import { EditOutlined, LockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
// DÜZELTME: API çağrısı artık güncel olan BankAccountService üzerinden yapılacak.
import { getDailyBalances } from '../../api/bankAccountService';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'; // <-- BU SATIRI EKLEYİN

dayjs.extend(isSameOrAfter);
const { Panel } = Collapse;
const { Text } = Typography;

const DailyEntryModal = ({ visible, onCancel, onSave, allBankAccounts }) => {
    const [form] = Form.useForm();
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [existingEntries, setExistingEntries] = useState({});
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
            // DÜZELTME: Fonksiyon artık doğru servisten çağrılıyor ve doğrudan data array'ini dönüyor.
            const allMonthEntries = await getDailyBalances(year, month);
            const dateString = date.format('YYYY-MM-DD');
            
            const entriesForDay = allMonthEntries.filter(entry => dayjs(entry.entry_date).format('YYYY-MM-DD') === dateString);
            
            const entriesMap = {};
            const formValues = {};
            entriesForDay.forEach(entry => {
                // DÜZELTME: `bank_name` ve `account_name` alanlarının API'den geldiği varsayılıyor.
                const key = `${entry.bank_name}-${entry.account_name}`;
                entriesMap[key] = entry;
                formValues[`sabah_${key}`] = entry.morning_balance;
                formValues[`aksam_${key}`] = entry.evening_balance;
            });
            setExistingEntries(entriesMap);
            form.setFieldsValue(formValues);

        } catch (error) {
            console.error("Mevcut girişler çekilirken hata:", error);
            message.error("Mevcut girişler çekilirken bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    }, [form]);

  useEffect(() => {
    if (visible) {
      fetchDataForDate(selectedDate);
    }
  }, [visible, selectedDate, fetchDataForDate]);

  const handleOk = () => {
    form.validateFields().then((values) => {
      const entryDate = dayjs(values.entryDate).format('DD.MM.YYYY');
      const entriesToSave = [];
      allBankAccounts.forEach(account => {
        // --- DEĞİŞİKLİK BURADA ---
        const key = `${account.bank.name}-${account.name}`;
        const sabahKey = `sabah_${key}`;
        const aksamKey = `aksam_${key}`;
        
        const sabahValue = values[sabahKey];
        const aksamValue = values[aksamKey];

        if ((sabahValue !== null && sabahValue !== undefined) || (aksamValue !== null && aksamValue !== undefined)) {
          entriesToSave.push({
            banka: account.bank.name, // Hatalı olan 'account.bank_name' düzeltildi
            hesap: account.name,
            tarih: entryDate,
            sabah: sabahValue,
            aksam: aksamValue,
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

  const filteredAccounts = allBankAccounts.filter(account => {
    const pivotStatus = account.pivot_status; // 'Pasif' veya 'Bloke' olabilir
    const pivotStartDate = account.pivot_start_date ? dayjs(account.pivot_start_date) : null;
    const pivotEndDate = account.pivot_end_date ? dayjs(account.pivot_end_date) : null;

    // Eğer hesabın hiç pasif/bloke geçmişi yoksa, her zaman göster.
    if (!pivotStatus || !pivotStartDate) {
      return true;
    }

    // Seçilen tarihin, pasif/bloke aralığının içinde olup olmadığını kontrol et.
    const isWithinInactivePeriod =
      selectedDate.isSameOrAfter(pivotStartDate, 'day') &&
      (!pivotEndDate || selectedDate.isSameOrBefore(pivotEndDate, 'day'));

    // Eğer tarih, pasif/bloke aralığının İÇİNDE DEĞİLSE hesabı göster.
    // (Yani, aralığın içindeyse GÖSTERME)
    return !isWithinInactivePeriod;
  });

  // Artık `allBankAccounts` yerine `filteredAccounts` kullanacağız.
  const groupedAccounts = filteredAccounts.reduce((acc, account) => {
    const bankName = account.bank.name;
    if (!acc[bankName]) acc[bankName] = [];
    acc[bankName].push(account);
    return acc;
  }, {});

  return (
    <Modal title="Günlük Giriş Ekle (Toplu)" open={visible} onCancel={onCancel} onOk={handleOk} okText="Kaydet" cancelText="İptal" width={700} destroyOnClose>
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
                    const accountKey = `${account.bank.name}-${account.name}`;
                    const existingEntry = existingEntries[accountKey];
                    const isEditing = editingAccounts.includes(accountKey);
                    const hasSabahData = existingEntry && (existingEntry.morning_balance !== null && existingEntry.morning_balance !== undefined);
                    const hasAksamData = existingEntry && (existingEntry.evening_balance !== null && existingEntry.evening_balance !== undefined);

                    // Sabah ve akşam girişleri için ayrı kilit durumu
                    const isDisabledSabah = hasSabahData && !isEditing;
                    const isDisabledAksam = hasAksamData && !isEditing;

                    return (
                      <Row key={account.id} gutter={16} align="middle" style={{ marginBottom: '8px' }}>
                        <Col span={6}><Text>{account.name}</Text></Col>
                        <Col span={7}>
                          <Form.Item name={`sabah_${accountKey}`} noStyle>
                            <InputNumber
                              disabled={isDisabledSabah}
                              style={{ width: '100%' }}
                              placeholder="Sabah"
                            />
                          </Form.Item>
                        </Col>
                        <Col span={7}>
                          <Form.Item name={`aksam_${accountKey}`} noStyle>
                            <InputNumber
                              disabled={isDisabledAksam}
                              style={{ width: '100%' }}
                              placeholder="Akşam"
                            />
                          </Form.Item>
                        </Col>
                        <Col span={4} style={{ textAlign: 'right' }}>
                          {/* Mevcut veriler varsa düzenleme düğmesini göster */}
                          {(hasSabahData || hasAksamData) && (
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
            !loading && <Empty description="Giriş yapılabilecek aktif hesap bulunmuyor." />
          )}
        </Spin>
      </Form>
    </Modal>
  );
};

export default DailyEntryModal;