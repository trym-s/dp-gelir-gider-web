import React, { useState } from 'react';
import { Modal, Button, Row, Col, Statistic, Tag, Typography, Divider, App, theme, Tooltip } from 'antd';
import { EditOutlined, CalendarOutlined, TagOutlined, EnvironmentOutlined, DollarCircleOutlined, CheckCircleOutlined, ExclamationCircleOutlined, DeleteOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

// Özel Türk Lirası ikonu
const LiraIcon = () => (
  <span role="img" aria-label="lira" className="anticon" style={{ verticalAlign: '0.125em', fontWeight: 'bold' }}>
    ₺
  </span>
);

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

const ExpenseDetailModal = ({ expense, visible, onCancel, onBack, onEdit, onDelete, onAddPayment }) => {
    const { modal } = App.useApp();
    const { token } = theme.useToken();
    const [isPaymentButtonHovered, setIsPaymentButtonHovered] = useState(false);

    if (!expense) return null;

    const statusInfo = getStatusInfo(expense.status);
    const canAddPayment = expense.status === 'UNPAID' || expense.status === 'PARTIALLY_PAID';

    const handleDeleteClick = () => {
        modal.confirm({
            title: 'Bu gideri silmek istediğinizden emin misiniz?',
            content: 'Bu işlem geri alınamaz.',
            okText: 'Evet, Sil',
            okType: 'danger',
            cancelText: 'Hayır',
            onOk: () => {
                if (onDelete) onDelete(expense.id);
            },
        });
    };

    const paymentButtonStyle = {
        backgroundColor: 'transparent',
        borderColor: token.colorSuccess,
        color: token.colorSuccess,
        marginRight: 8,
    };

    const paymentButtonHoverStyle = {
        backgroundColor: token.colorSuccess,
        borderColor: token.colorSuccess,
        color: token.colorWhite,
        marginRight: 8,
    };

    const modalTitle = (
        <div style={{ display: 'flex', alignItems: 'center' }}>
            {onBack && (
                <Tooltip title="Geri">
                    <Button 
                        shape="circle" 
                        icon={<ArrowLeftOutlined />} 
                        onClick={onBack} 
                        style={{ marginRight: '16px', border: 'none', boxShadow: 'none' }}
                    />
                </Tooltip>
            )}
            <Title level={4} style={{ margin: 0, flex: 1 }}>Gider Detayı</Title>
        </div>
    );

    const modalFooter = (
        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', alignItems: 'center' }}>
            <Button 
                key="delete" 
                danger 
                icon={<DeleteOutlined />} 
                onClick={handleDeleteClick} 
                size="large"
                style={{ marginRight: 'auto' }}
            >
                Sil
            </Button>
            {canAddPayment && (
                <Button 
                    key="addPayment" 
                    icon={<LiraIcon />} 
                    onClick={() => onAddPayment(expense)} 
                    size="large" 
                    style={isPaymentButtonHovered ? paymentButtonHoverStyle : paymentButtonStyle}
                    onMouseEnter={() => setIsPaymentButtonHovered(true)}
                    onMouseLeave={() => setIsPaymentButtonHovered(false)}
                >
                    Ödeme Gir
                </Button>
            )}
            <Button 
                key="edit" 
                icon={<EditOutlined />} 
                onClick={() => onEdit(expense)} 
                size="large"
            >
                Düzenle
            </Button>
        </div>
    );

    return (
        <Modal
            title={modalTitle}
            open={visible}
            onCancel={onCancel}
            footer={modalFooter}
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
                    <DetailItem icon={<CalendarOutlined/>} title="Son Ödeme Tarihi">{dayjs(expense.date).format('DD MMMM YYYY')}</DetailItem>
                    <DetailItem icon={<EnvironmentOutlined/>} title="Bölge">{expense.region?.name}</DetailItem>
                    <DetailItem icon={<DollarCircleOutlined/>} title="Ödeme Türü">{expense.payment_type?.name}</DetailItem>
                </Col>
                <Col xs={24} sm={12}>
                    <DetailItem icon={<TagOutlined/>} title="Hesap Adı">{expense.account_name?.name}</DetailItem>
                    <DetailItem icon={<TagOutlined/>} title="Bütçe Kalemi">{expense.budget_item?.name}</DetailItem>
                </Col>
            </Row>
             <Divider style={{margin: '12px 0'}}/>
            <Row justify="space-between" style={{color: 'var(--text-color-light)', fontSize: '12px'}}>
                 <Col>Oluşturulma: {dayjs(expense.created_at).format('DD.MM.YY HH:mm')}</Col>
                 <Col>Güncelleme: {dayjs(expense.updated_at).format('DD.MM.YY HH:mm')}</Col>
            </Row>
        </Modal>
    );
};

export default ExpenseDetailModal;

