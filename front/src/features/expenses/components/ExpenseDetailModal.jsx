import React from 'react';
import { Modal, Button, Row, Col, Statistic, Tag, Typography, Divider } from 'antd';
import { EditOutlined, CloseOutlined, CalendarOutlined, TagOutlined, EnvironmentOutlined, DollarCircleOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const getStatusInfo = (status) => {
    const statusMap = {
        'PAID': { color: 'green', text: 'Ödendi', icon: <CheckCircleOutlined /> },
        'UNPAID': { color: 'red', text: 'Ödenmedi', icon: <ExclamationCircleOutlined /> },
        'PARTIALLY_PAID': { color: 'orange', text: 'Kısmi Ödendi', icon: <ExclamationCircleOutlined /> },
        'OVERPAID': { color: 'purple', text: 'Fazla Ödendi', icon: <CheckCircleOutlined /> },
    };
    return statusMap[status] || { color: 'default', text: status, icon: null };
};

const DetailItem = ({ icon, title, children }) => (
    <div style={{ marginBottom: '16px' }}>
        <Text type="secondary">{icon} {title}</Text><br/>
        <Text strong>{children || '-'}</Text>
    </div>
);

const ExpenseDetailModal = ({ expense, visible, onCancel, onEdit }) => {
    if (!expense) return null;

    const statusInfo = getStatusInfo(expense.status);

    return (
        <Modal
            title={<Title level={4} style={{ margin: 0 }}>Gider Detayı</Title>}
            open={visible}
            onCancel={onCancel}
            footer={[
                <Button key="cancel" icon={<CloseOutlined />} onClick={onCancel} size="large">
                    Kapat
                </Button>,
                <Button key="edit" type="primary" icon={<EditOutlined />} onClick={() => onEdit(expense)} size="large">
                    Düzenle
                </Button>,
            ]}
            width={700}
        >
            <Row gutter={[16, 16]} align="middle">
                <Col span={24}>
                    <Title level={5}>{expense.description}</Title>
                </Col>
            </Row>
            <Divider/>
            <Row gutter={[32, 16]}>
                <Col xs={24} sm={12} md={8}>
                    <Statistic title="Tutar" value={expense.amount} prefix="₺" precision={2} />
                </Col>
                <Col xs={24} sm={12} md={8}>
                    <Statistic title="Kalan Tutar" value={expense.remaining_amount} prefix="₺" precision={2} />
                </Col>
                <Col xs={24} sm={12} md={8}>
                     <Text type="secondary">Durum</Text><br/>
                     <Tag icon={statusInfo.icon} color={statusInfo.color} style={{ fontSize: '16px', padding: '5px 10px' }}>{statusInfo.text}</Tag>
                </Col>
            </Row>
            <Divider/>
            <Row gutter={[32, 16]}>
                <Col xs={24} sm={12}>
                    <DetailItem icon={<CalendarOutlined/>} title="Gider Tarihi">{dayjs(expense.date).format('DD MMMM YYYY')}</DetailItem>
                    <DetailItem icon={<EnvironmentOutlined/>} title="Bölge">{expense.region?.name}</DetailItem>
                    <DetailItem icon={<DollarCircleOutlined/>} title="Ödeme Türü">{expense.payment_type?.name}</DetailItem>
                </Col>
                <Col xs={24} sm={12}>
                    <DetailItem icon={<TagOutlined/>} title="Hesap Adı">{expense.account_name?.name}</DetailItem>
                    <DetailItem icon={<TagOutlined/>} title="Bütçe Kalemi">{expense.budget_item?.name}</DetailItem>
                </Col>
            </Row>
             <Divider style={{margin: '12px 0'}}/>
            <Row justify="space-between" style={{color: '#888', fontSize: '12px'}}>
                 <Col>Oluşturulma: {dayjs(expense.created_at).format('DD.MM.YY HH:mm')}</Col>
                 <Col>Güncelleme: {dayjs(expense.updated_at).format('DD.MM.YY HH:mm')}</Col>
            </Row>
        </Modal>
    );
};

export default ExpenseDetailModal;