// src/features/dashboard/activity-log/Reminders.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { List, Spin, Empty, Typography, Collapse, message, Tabs, Dropdown, Button, Menu, Space } from 'antd';
// Gerekli yeni ikonları import ediyoruz
import {
    BellFilled, FilterOutlined, BankOutlined, AlertOutlined, CreditCardOutlined,
    DollarCircleOutlined, ArrowUpOutlined, ArrowDownOutlined, TransactionOutlined
} from '@ant-design/icons';
import styles from '../styles/ActivityLog.module.css';
import ReminderListItem from './ReminderListItem';
import { getReminders } from '../../../api/reminderService';

const { Title } = Typography;
const { Panel } = Collapse;
const { TabPane } = Tabs;

// 1. ADIM: Tüm alt hatırlatma türleri için merkezi bir yapılandırma objesi oluşturuyoruz.
// Bu obje; etiket, renk, ikon ve filtreleme için kullanılacak anahtar kelimeyi içerir.
const reminderSubTypes = {
    // Eksik Girişler (DAILY_ENTRY_MISSING) için alt türler
    'bank_log': { label: 'Banka Bakiye Girişi', value: 'bank_log', color: '#faad14', icon: <BankOutlined /> },
    'balance': { label: 'Banka Hesap Durumu', value: 'balance', color: '#13c2c2', icon: <TransactionOutlined /> },
    'kmh': { label: 'KMH Risk Girişi', value: 'kmh', color: '#ff7a45', icon: <AlertOutlined /> },
    'cclimit': { label: 'Kredi Kartı Limit', value: 'cclimit', color: '#722ed1', icon: <CreditCardOutlined /> },

    // Yaklaşan Vadeler (DUE_DATE_UPCOMING) için alt türler
    'cc_due': { label: 'Kredi Kartı Vadesi', value: 'cc_due', color: '#1890ff', icon: <CreditCardOutlined /> },
    'loan_due': { label: 'Kredi Vadesi', value: 'loan_due', color: '#52c41a', icon: <DollarCircleOutlined /> },
    'income_due': { label: 'Gelir Vadesi', value: 'income_due', color: '#36cfc9', icon: <ArrowUpOutlined /> },
    'expense_due': { label: 'Gider Vadesi', value: 'expense_due', color: '#f5222d', icon: <ArrowDownOutlined /> },
};

// Her ana kategori için filtre seçeneklerini dinamik olarak oluşturalım
const missingEntryFilters = [
    { label: 'Tümü', value: 'ALL', color: '#8c8c8c' },
    ...Object.values(reminderSubTypes).filter(st => ['balance', 'bank_log', 'kmh', 'cclimit'].includes(st.value))
];

const upcomingDueFilters = [
    { label: 'Tümü', value: 'ALL', color: '#8c8c8c' },
    ...Object.values(reminderSubTypes).filter(st => ['cc_due', 'loan_due', 'income_due', 'expense_due'].includes(st.value))
];


const Reminders = ({ onReminderAction }) => {
    const [loading, setLoading] = useState(true);
    const [allReminders, setAllReminders] = useState([]);
    const [activeKey, setActiveKey] = useState([]);
    const [missingFilter, setMissingFilter] = useState('ALL');
    const [upcomingFilter, setUpcomingFilter] = useState('ALL');

    useEffect(() => {
        const fetchReminders = async () => {
            setLoading(true);
            try {
                const data = await getReminders();
                setAllReminders(data);
            } catch (error) {
                message.error("Hatırlatmalar yüklenirken bir hata oluştu.");
            } finally {
                setLoading(false);
            }
        };
        fetchReminders();
    }, []);

    const handleDismiss = (id) => {
        setAllReminders(prev => prev.filter(r => r.id !== id));
    };

    const missingEntries = useMemo(() => allReminders.filter(r => r.type === 'DAILY_ENTRY_MISSING'), [allReminders]);
    const upcomingDues = useMemo(() => allReminders.filter(r => r.type === 'DUE_DATE_UPCOMING'), [allReminders]);
    console.log("Yaklaşan Vade Verileri:", upcomingDues.map(r => r.meta)); 

    // 2. ADIM: Filtreleme mantığını meta.entry_type'a göre güncelliyoruz.
    const filteredMissing = useMemo(() => {
        if (missingFilter === 'ALL') return missingEntries;
        return missingEntries.filter(r => r.meta?.entry_type === missingFilter);
    }, [missingEntries, missingFilter]);

    const filteredUpcoming = useMemo(() => {
        if (upcomingFilter === 'ALL') return upcomingDues;
        return upcomingDues.filter(r => r.meta?.entry_type === upcomingFilter);
    }, [upcomingDues, upcomingFilter]);

    const createFilterMenu = (options, currentFilter, setFilter) => (
        <Menu onClick={(e) => setFilter(e.key)} selectedKeys={[currentFilter]}>
            {options.map(type => (
                <Menu.Item key={type.value}>
                    <Space align="center">
                        {type.icon ? React.cloneElement(type.icon, { style: { color: type.color } }) : <span className={styles.filterDot} style={{ backgroundColor: type.color }}></span>}
                        {type.label}
                    </Space>
                </Menu.Item>
            ))}
        </Menu>
    );

    // 3. ADIM: Her bir hatırlatma listesi öğesini render ederken, ona uygun görseli (ikon, renk) prop olarak gönderiyoruz.
    const renderReminderItem = (item) => {
        const visuals = reminderSubTypes[item.meta?.entry_type] || { icon: <BellFilled />, color: '#8c8c8c' }; // Eğer tür tanımsızsa varsayılan ikon
        return (
            <ReminderListItem
                reminder={item}
                visuals={visuals} // Görsel bilgiyi prop olarak iletiyoruz
                onDismiss={handleDismiss}
                onAction={onReminderAction}
            />
        );
    };

    return (
        <Collapse
            ghost
            bordered={false}
            activeKey={activeKey}
            onChange={(key) => setActiveKey(key)}
            className={styles.sonIslemlerCard}
            style={{ padding: 0, marginBottom: '24px' }}
        >
            <Panel
                key="1"
                showArrow={false}
                header={
                    <div className={styles.unifiedHeader}>
                        <div className={styles.headerContent}>
                            <BellFilled className={styles.headerIcon} />
                            <Title level={5} className={styles.headerTitle}>
                                Hatırlatmalar ({allReminders.length})
                            </Title>
                        </div>
                    </div>
                }
                // DEĞİŞİKLİK 1: Panel'in kendi iç boşluğu sıfırlandı.
                bodyStyle={{ padding: 0 }}
            >
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}><Spin /></div>
                ) : (
                    // DEĞİŞİKLİK 2: Tabs bileşenine özel bir sınıf atandı.
                    <Tabs
                        defaultActiveKey="1"
                        size="small"
                        className={styles.compactTabs}
                    >
                        <TabPane tab={`Eksik Girişler (${missingEntries.length})`} key="1">
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px', paddingRight: '8px' }}>
                                <Dropdown overlay={createFilterMenu(missingEntryFilters, missingFilter, setMissingFilter)} trigger={['click']}>
                                    <Button type="text" icon={<FilterOutlined />} size="small">Filtrele</Button>
                                </Dropdown>
                            </div>
                            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                <List
                                    dataSource={filteredMissing}
                                    renderItem={renderReminderItem}
                                    locale={{ emptyText: <Empty description="Bekleyen eksik giriş bulunmuyor." image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                                />
                            </div>
                        </TabPane>
                        <TabPane tab={`Yaklaşan Vadeler (${upcomingDues.length})`} key="2">
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px', paddingRight: '8px' }}>
                                <Dropdown overlay={createFilterMenu(upcomingDueFilters, upcomingFilter, setUpcomingFilter)} trigger={['click']}>
                                    <Button type="text" icon={<FilterOutlined />} size="small">Filtrele</Button>
                                </Dropdown>
                            </div>
                            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                <List
                                    dataSource={filteredUpcoming}
                                    renderItem={renderReminderItem}
                                    locale={{ emptyText: <Empty description="Yaklaşan vade bulunmuyor." image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                                />
                            </div>
                        </TabPane>
                    </Tabs>
                )}
            </Panel>
        </Collapse>
    );
};

export default Reminders;
