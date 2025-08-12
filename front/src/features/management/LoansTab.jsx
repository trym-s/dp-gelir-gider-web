// management/LoansTab.jsx (NİHAİ GÜNCEL VERSİYON)

import React, { useState } from 'react';
import {
    Table, Button, Space, Modal, Form, Input, message, Popconfirm,
    InputNumber, DatePicker, Row, Col, Alert, Select, Spin, Collapse, Tag, Typography
} from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLoans, updateLoan, deleteLoan, getLoanTypes, getBankAccounts } from '../../api/loanService';
import dayjs from 'dayjs';

const { Title } = Typography; // <-- YENİ EKLENDİ
const { Panel } = Collapse;
const { Option } = Select;

const LoansTab = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingLoan, setEditingLoan] = useState(null);
    const [form] = Form.useForm();
    const queryClient = useQueryClient();

    const { data: loans = [], isLoading: isLoadingLoans } = useQuery({
        queryKey: ['loans'],
        queryFn: getLoans,
        select: (response) => (response.data || []).map(l => ({ ...l, key: l.id }))
    });

    const { data: loanTypes = [] } = useQuery({
        queryKey: ['loanTypes'],
        queryFn: getLoanTypes,
        select: (response) => response.data || []
    });

    const { data: bankAccounts = [] } = useQuery({
        queryKey: ['bankAccounts'],
        queryFn: getBankAccounts,
        select: (response) => response || []
    });
    console.log("LoansTab -> Gelen banka hesapları:", JSON.stringify(bankAccounts, null, 2));
    const { mutate: updateLoanMutation, isLoading: isUpdating } = useMutation({
        mutationFn: ({ loanId, data }) => updateLoan(loanId, data),
        onSuccess: () => {
            message.success('Kredi başarıyla güncellendi.');
            queryClient.invalidateQueries({ queryKey: ['loans'] });
            handleCancel();
        },
        onError: (error) => {
            const errorMessage = error.response?.data?.error || 'Güncelleme işlemi başarısız oldu.';
            message.error(errorMessage);
            console.error("Update Error:", error.response || error);
        }
    });

    const { mutate: deleteLoanMutation } = useMutation({
        mutationFn: deleteLoan,
        onSuccess: () => {
            message.success('Kredi başarıyla silindi.');
            queryClient.invalidateQueries({ queryKey: ['loans'] });
        },
        onError: (error) => {
            message.error('Silme işlemi başarısız oldu.');
            console.error("Delete Error:", error.response || error);
        }
    });

    const showModal = (loan) => {
        if (!loan) {
            message.error("Düzenlenecek kredi bilgisi bulunamadı!");
            return;
        }
        setEditingLoan(loan);
        try {
            form.setFieldsValue({
                name: loan.name,
                description: loan.description,
                payment_due_day: loan.payment_due_day,
                bank_account_id: loan.bank_account?.id,
                loan_type_id: loan.loan_type?.id,
                amount_drawn: loan.amount_drawn,
                term_months: loan.term_months,
                monthly_interest_rate: loan.monthly_interest_rate != null ? (Number(loan.monthly_interest_rate) * 100) : 0,
                date_drawn: loan.date_drawn ? dayjs(loan.date_drawn, 'YYYY-MM-DD') : null,
            });
            setIsModalVisible(true);
        } catch (e) {
            console.error("Forma veri doldururken hata oluştu:", e);
            message.error("Form açılırken bir hata oluştu. Lütfen konsolu kontrol edin.");
        }
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingLoan(null);
        form.resetFields();
    };
    
    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            
            const payload = {
                ...values,
                monthly_interest_rate: values.monthly_interest_rate / 100, // Formdan gelen %'li değeri ondalığa çevir
                date_drawn: values.date_drawn.format('YYYY-MM-DD'),
            };
            
            updateLoanMutation({ loanId: editingLoan.id, data: payload });
        } catch (errorInfo) {
            if (errorInfo.errorFields && errorInfo.errorFields.length > 0) {
                 message.warning('Lütfen tüm zorunlu alanları doğru bir şekilde doldurun.');
            }
            console.log('Validation Failed:', errorInfo);
        }
    };

    const handleDelete = (loanId) => {
        deleteLoanMutation(loanId);
    };

    const columns = [
        { title: 'Kredi Adı', dataIndex: 'name', key: 'name' },
        { title: 'Banka Hesabı', dataIndex: ['bank_account', 'name'], key: 'bank_name' },
        { title: 'Kredi Türü', dataIndex: ['loan_type', 'name'],key: 'loan_type' },
        {
            title: 'Ödeme Yapıldı mı?',
            dataIndex: 'has_payments',
            key: 'has_payments',
            render: (has_payments) => (has_payments ? 'Evet' : 'Hayır')
        },
        {
            title: 'İşlemler', key: 'action',
            render: (_, record) => (
                <Space size="middle">
                    <Button type="link" onClick={() => showModal(record)}>Düzenle</Button>
                    <Popconfirm title="Bu krediyi silmek istediğinizden emin misiniz?" onConfirm={() => handleDelete(record.id)} okText="Evet" cancelText="Hayır">
                        <Button type="link" danger>Sil</Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const hasPayments = editingLoan?.has_payments;

    return (
        <>
            <Table columns={columns} dataSource={loans} rowKey="id" loading={isLoadingLoans} />
            
            {editingLoan && (
                <Modal 
                    title="Kredi Düzenle" 
                    open={isModalVisible} 
                    onOk={handleOk} 
                    onCancel={handleCancel} 
                    width={800} 
                    destroyOnClose
                    confirmLoading={isUpdating}
                >
                    {hasPayments && (
                        <Alert
                            message="Kredi Ödemeleri Başlamış"
                            description="Bu krediye ait ödemeler başladığı için ana finansal bilgiler (tutar, vade, faiz, çekim tarihi) değiştirilemez."
                            type="info" showIcon style={{ marginBottom: 24 }}
                        />
                    )}
                    <Form form={form} layout="vertical" name="loan_edit_form">
                        <Form.Item name="name" label="Kredi Adı" rules={[{ required: true }]}><Input /></Form.Item>
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="bank_account_id" label="Banka Hesabı" rules={[{ required: true }]}>
                                    <Select placeholder="Banka hesabı seçin">{bankAccounts.map(acc => <Option key={acc.id} value={acc.id}>{`${acc.bank.name} - ${acc.name}`}</Option>)}</Select>
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="loan_type_id" label="Kredi Türü" rules={[{ required: true }]}>
                                    <Select placeholder="Kredi türü seçin">{loanTypes.map(type => <Option key={type.id} value={type.id}>{type.name}</Option>)}</Select>
                                </Form.Item>
                            </Col>
                        </Row>
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item label="Her Ayın Ödeme Günü" name="payment_due_day" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={1} max={31} /></Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="description" label="Açıklama (Opsiyonel)"><Input.TextArea rows={1} /></Form.Item>
                            </Col>
                        </Row>
                        <Row gutter={16}>
                            <Col span={8}>
                                <Form.Item label="Çekilen Toplam Tutar (₺)" name="amount_drawn" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={0} disabled={hasPayments} formatter={val => `₺ ${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={val => val.replace(/₺\s?|(,*)/g, '')} /></Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item label="Vade (Ay)" name="term_months" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={1} disabled={hasPayments} /></Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item label="Aylık Faiz Oranı (%)" name="monthly_interest_rate" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} disabled={hasPayments} formatter={val => `${val}%`} parser={val => val.replace('%', '')} /></Form.Item>
                            </Col>
                        </Row>
                        <Form.Item label="Çekildiği Tarih" name="date_drawn" rules={[{ required: true }]}>
                            <DatePicker format="DD.MM.YYYY" style={{ width: '100%' }} disabled={hasPayments} />
                        </Form.Item>
                    </Form>
                </Modal>
            )}
        </>
    );
};

export default LoansTab;