import React, { useState, useEffect } from 'react';
import { Modal, Form, InputNumber, DatePicker, Collapse, Row, Col, Typography, Spin, message, Empty, Button, Tooltip } from 'antd';
import { EditOutlined, LockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getDailyLimitsForMonth } from '../../api/creditCardService';

const { Panel } = Collapse;
const { Text } = Typography;

const CreditCardDailyEntryModal = ({ visible, onCancel, onSave, allCreditCards }) => {
  const [form] = Form.useForm();
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [existingEntries, setExistingEntries] = useState({});
  const [loading, setLoading] = useState(false);
  const [editingCards, setEditingCards] = useState([]);

  useEffect(() => {
    if (visible) {
      form.setFieldsValue({ entryDate: selectedDate });
      fetchDataForDate(selectedDate);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, selectedDate]);

  const fetchDataForDate = async (date) => {
    setLoading(true);
    form.resetFields();
    form.setFieldsValue({ entryDate: date });
    setEditingCards([]);

    try {
      const year = date.year();
      const month = date.month() + 1;
      const allMonthLimits = await getDailyLimitsForMonth(year, month);
      const dateString = date.format('YYYY-MM-DD');
      const entriesForDay = allMonthLimits.filter(entry => entry.entry_date === dateString);
      
      const entriesMap = {};
      const formValues = {};
      entriesForDay.forEach(entry => {
        const key = entry.credit_card_id; // ID'yi anahtar olarak kullan
        entriesMap[key] = entry;
        formValues[`sabah_${key}`] = entry.morning_limit;
        formValues[`aksam_${key}`] = entry.evening_limit;
      });
      setExistingEntries(entriesMap);
      form.setFieldsValue(formValues);

    } catch (error) {
      message.error("Mevcut limit verileri çekilirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleOk = () => {
    form.validateFields().then((values) => {
      const entryDate = dayjs(values.entryDate).format('DD.MM.YYYY');
      const entriesToSave = [];
      (allCreditCards || []).forEach(card => {
        const key = card.id;
        const sabahKey = `sabah_${key}`;
        const aksamKey = `aksam_${key}`;
        if (values[sabahKey] != null || values[aksamKey] != null) {
          entriesToSave.push({
            credit_card_id: card.id, // Backend'in bekledeği ID
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

  const handleEditToggle = (cardId) => {
    setEditingCards(prev => 
      prev.includes(cardId) 
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId]
    );
  };

  const disabledFutureDate = (current) => current && current > dayjs().endOf('day');

  const groupedCards = (allCreditCards || []).reduce((acc, card) => {
    const bankName = card.bank_name;
    if (!acc[bankName]) acc[bankName] = [];
    acc[bankName].push(card);
    return acc;
  }, {});

  return (
    <Modal title="Günlük Kullanılabilir Limit Girişi" visible={visible} onCancel={onCancel} onOk={handleOk} okText="Kaydet" cancelText="İptal" width={700}>
      <Form layout="vertical" form={form}>
        <Form.Item name="entryDate" label="Giriş Tarihi" rules={[{ required: true }]}>
          <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" allowClear={false} onChange={setSelectedDate} disabledDate={disabledFutureDate} />
        </Form.Item>
        <Spin spinning={loading}>
          {Object.keys(groupedCards).length > 0 ? (
            <Collapse defaultActiveKey={Object.keys(groupedCards)} expandIconPosition="right">
              {Object.entries(groupedCards).map(([bankName, cardsInBank]) => (
                <Panel header={<Text strong>{bankName}</Text>} key={bankName}>
                  {cardsInBank.map((card) => {
                    const cardKey = card.id;
                    const hasExistingData = !!existingEntries[cardKey];
                    const isEditing = editingCards.includes(cardKey);
                    const isDisabled = hasExistingData && !isEditing;

                    return (
                      <Row key={card.id} gutter={16} align="middle" style={{ marginBottom: '8px' }}>
                        <Col span={6}><Text>{card.name}</Text></Col>
                        <Col span={7}><Form.Item name={`sabah_${cardKey}`} noStyle><InputNumber disabled={isDisabled} style={{ width: '100%' }} placeholder="Sabah Limiti" /></Form.Item></Col>
                        <Col span={7}><Form.Item name={`aksam_${cardKey}`} noStyle><InputNumber disabled={isDisabled} style={{ width: '100%' }} placeholder="Akşam Limiti" /></Form.Item></Col>
                        <Col span={4} style={{ textAlign: 'right' }}>
                          {hasExistingData && (
                            <Tooltip title={isEditing ? 'Kilitle' : 'Düzenle'}>
                              <Button
                                icon={isEditing ? <LockOutlined /> : <EditOutlined />}
                                onClick={() => handleEditToggle(cardKey)}
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
            !loading && <Empty description="Giriş yapılabilecek kredi kartı bulunmuyor." />
          )}
        </Spin>
      </Form>
    </Modal>
  );
};

export default CreditCardDailyEntryModal;
