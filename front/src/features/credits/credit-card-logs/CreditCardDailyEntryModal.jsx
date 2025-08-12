import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Form, InputNumber, DatePicker, Collapse, Row, Col, Typography, Spin, message, Empty, Button, Tooltip, Space } from 'antd';
import { EditOutlined, LockOutlined, BankOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
// Eklenti importları kaldırıldı.
import { getDailyLimitsForMonth } from '../../../api/creditCardService';

const { Panel } = Collapse;
const { Text } = Typography;

const CreditCardDailyEntryModal = ({ visible, onCancel, onSave, allCreditCards }) => {
    const [form] = Form.useForm();
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [existingEntries, setExistingEntries] = useState({});
    const [loading, setLoading] = useState(false);
    const [editingCards, setEditingCards] = useState([]);
    const [isDataLoaded, setIsDataLoaded] = useState(false);

    const fetchDataForDate = useCallback(async (date) => {
        setLoading(true);
        setIsDataLoaded(false);
        form.resetFields();
        form.setFieldsValue({ entryDate: date });
        setEditingCards([]);

        try {
            const year = date.year();
            const month = date.month() + 1;
            const allMonthLimits = await getDailyLimitsForMonth(year, month);
            
            // ### DEĞİŞİKLİK: isSame eklentisi yerine format karşılaştırması kullanıldı ###
            const dateString = date.format('YYYY-MM-DD');
            const entriesForDay = allMonthLimits.filter(entry => dayjs(entry.entry_date).format('YYYY-MM-DD') === dateString);

            const entriesMap = {};
            const formValues = {};
            entriesForDay.forEach(entry => {
                const key = entry.credit_card_id;
                entriesMap[key] = entry;
                formValues[`sabah_${key}`] = entry.morning_limit;
                formValues[`aksam_${key}`] = entry.evening_limit;
            });

            setExistingEntries(entriesMap);
            form.setFieldsValue(formValues);
            setIsDataLoaded(true);

        } catch (error) {
            message.error("Mevcut limit verileri çekilirken bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    }, [form]);

    useEffect(() => {
        if (visible) {
            fetchDataForDate(selectedDate);
        }
    }, [visible, selectedDate, fetchDataForDate]);

    const filteredCards = (allCreditCards || []).filter(card => {
        if (card.status === "Aktif" || !card.status) {
            return true;
        }
        if (!card.status_start_date) {
            return false;
        }
        const statusStartDate = dayjs(card.status_start_date);
        
        // ### DEĞİŞİKLİK: isBefore eklentisi yerine doğrudan karşılaştırma kullanıldı ###
        // Saat, dakika ve saniyeyi sıfırlayarak sadece gün bazında karşılaştırma yapıyoruz.
        return selectedDate.startOf('day').toDate() < statusStartDate.startOf('day').toDate();
    });

    const groupedCards = filteredCards.reduce((acc, card) => {
        const bankName = card.bank_account?.bank?.name || card.bank_name || 'Diğer';
        if (!acc[bankName]) {
            acc[bankName] = [];
        }
        acc[bankName].push(card);
        return acc;
    }, {});

    const handleOk = () => {
        form.validateFields().then((values) => {
            const entryDate = dayjs(values.entryDate).format('DD.MM.YYYY');
            const entriesToSave = [];
            
            filteredCards.forEach(card => {
                const key = card.id;
                const sabahKey = `sabah_${key}`;
                const aksamKey = `aksam_${key}`;

                if (values[sabahKey] != null || values[aksamKey] != null) {
                    entriesToSave.push({
                        credit_card_id: card.id,
                        tarih: entryDate,
                        sabah: values[sabahKey],
                        aksam: values[aksamKey],
                    });
                }
            });
            onSave(entriesToSave);
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

    return (
        <Modal title="Günlük Kullanılabilir Limit Girişi" open={visible} onCancel={onCancel} onOk={handleOk} okText="Kaydet" cancelText="İptal" width={700} destroyOnClose>
            <Form layout="vertical" form={form}>
                <Form.Item name="entryDate" label="Giriş Tarihi" rules={[{ required: true, message: 'Lütfen bir tarih seçin!' }]}>
                    <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" allowClear={false} onChange={setSelectedDate} disabledDate={disabledFutureDate} />
                </Form.Item>
                <Spin spinning={loading}>
                    {isDataLoaded && Object.keys(groupedCards).length > 0 ? (
                        <Collapse defaultActiveKey={Object.keys(groupedCards)} expandIconPosition="end">
                            {Object.entries(groupedCards).map(([bankName, cardsInBank]) => (
                                <Panel
                                  header={
                                    <Space>
                                      <BankOutlined />
                                      <Text strong>{bankName}</Text>
                                    </Space>
                                  }
                                  key={bankName}
                                >
                                    {cardsInBank.map((card) => {
                                        const cardKey = card.id;
                                        const existingEntry = existingEntries[cardKey];
                                        const isEditing = editingCards.includes(cardKey);
                                        const hasSabahData = existingEntry && existingEntry.morning_limit != null;
                                        const hasAksamData = existingEntry && existingEntry.evening_limit != null;
                                        const isSabahDisabled = hasSabahData && !isEditing;
                                        const isAksamDisabled = hasAksamData && !isEditing;
                                        const showEditButton = hasSabahData || hasAksamData;
                                        
                                        return (
                                            <Row key={card.id} gutter={16} align="middle" style={{ marginBottom: '8px' }}>
                                                <Col span={6}><Text>{card.name}</Text></Col>
                                                <Col span={7}>
                                                    <Form.Item name={`sabah_${cardKey}`} noStyle>
                                                        <InputNumber disabled={isSabahDisabled} style={{ width: '100%' }} placeholder="Sabah Limiti" />
                                                    </Form.Item>
                                                </Col>
                                                <Col span={7}>
                                                    <Form.Item name={`aksam_${cardKey}`} noStyle>
                                                        <InputNumber disabled={isAksamDisabled} style={{ width: '100%' }} placeholder="Akşam Limiti" />
                                                    </Form.Item>
                                                </Col>
                                                <Col span={4} style={{ textAlign: 'right' }}>
                                                    {showEditButton && (
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
                        !loading && <Empty description="Seçilen tarih için giriş yapılabilecek aktif kredi kartı bulunmuyor." />
                    )}
                </Spin>
            </Form>
        </Modal>
    );
};

export default CreditCardDailyEntryModal;