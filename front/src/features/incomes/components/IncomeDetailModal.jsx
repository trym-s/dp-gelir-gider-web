import React from 'react';
import { Modal, Button, Row, Col, Statistic, Tag, Typography, Divider, App, Tooltip } from 'antd';
import { EditOutlined, CalendarOutlined, TagOutlined, EnvironmentOutlined, CheckCircleOutlined, ExclamationCircleOutlined, DeleteOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const getStatusInfo = (status) => {
    const statusMap = {
        'RECEIVED': { color: 'green', text: 'Alındı', icon: <CheckCircleOutlined /> },
        'UNRECEIVED': { color: 'red', text: 'Alınmadı', icon: <ExclamationCircleOutlined /> },
        'PARTIALLY_RECEIVED': { color: 'orange', text: 'Kısmi Alındı', icon: <ExclamationCircleOutlined /> },
    };
    return statusMap[status] || { color: 'default', text: status, icon: null };
};

const DetailItem = ({ icon, title, children }) => (
    <div style={{ marginBottom: '16px' }}>
        <Text type="secondary">{icon} {title}</Text><br/>
        <Text strong>{children || '-'}</Text>
    </div>
);

const IncomeDetailModal = ({ income, visible, onCancel, onBack, onEdit, onDelete, onAddReceipt }) => {
    const { modal } = App.useApp();

    if (!income) return null;

    const statusInfo = getStatusInfo(income.status);
    const canAddReceipt = income.status === 'UNRECEIVED' || income.status === 'PARTIALLY_RECEIVED';

    const handleDeleteClick = () => {
        modal.confirm({
            title: 'Bu geliri silmek istediğinizden emin misiniz?',
            content: 'Bu işlem geri alınamaz.',
            okText: 'Evet, Sil',
            okType: 'danger',
            cancelText: 'Hayır',
            onOk: () => {
                if (onDelete) onDelete(income.id);
            },
        });
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
            <Title level={4} style={{ margin: 0, flex: 1 }}>Gelir Detayı</Title>
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
            {canAddReceipt && (
                <Button 
                    key="addReceipt" 
                    type="primary" 
                    onClick={() => onAddReceipt(income)} 
                    size="large"
                    style={{ marginRight: 8 }}
                >
                    Tahsilat Gir
                </Button>
            )}
            <Button 
                key="edit" 
                icon={<EditOutlined />} 
                onClick={() => onEdit(income)} 
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
                    <Title level={5}>{income.description}</Title>
                </Col>
            </Row>
            <Divider/>
            <Row gutter={[32, 16]}>
                <Col xs={24} sm={12} md={8}>
                    <Statistic title="Tutar" value={income.total_amount} prefix="₺" precision={2} />
                </Col>
                <Col xs={24} sm={12} md={8}>
                    <Statistic title="Alınan Tutar" value={income.received_amount} prefix="₺" precision={2} />
                </Col>
                <Col xs={24} sm={12} md={8}>
                     <Text type="secondary">Durum</Text><br/>
                     <Tag icon={statusInfo.icon} color={statusInfo.color} style={{ fontSize: '16px', padding: '5px 10px' }}>{statusInfo.text}</Tag>
                </Col>
            </Row>
            <Divider/>
            <Row gutter={[32, 16]}>
                <Col xs={24} sm={12}>
                    <DetailItem icon={<CalendarOutlined/>} title="Gelir Tarihi">{dayjs(income.date).format('DD MMMM YYYY')}</DetailItem>
                    <DetailItem icon={<EnvironmentOutlined/>} title="Bölge">{income.region?.name}</DetailItem>
                </Col>
                <Col xs={24} sm={12}>
                    <DetailItem icon={<TagOutlined/>} title="Hesap Adı">{income.account_name?.name}</DetailItem>
                    <DetailItem icon={<TagOutlined/>} title="Bütçe Kalemi">{income.budget_item?.name}</DetailItem>
                </Col>
            </Row>
             <Divider style={{margin: '12px 0'}}/>
            <Row justify="space-between" style={{color: '#888', fontSize: '12px'}}>
                 <Col>Oluşturulma: {dayjs(income.created_at).format('DD.MM.YY HH:mm')}</Col>
                 <Col>Güncelleme: {dayjs(income.updated_at).format('DD.MM.YY HH:mm')}</Col>
            </Row>
        </Modal>
    );
};

export default IncomeDetailModal;
