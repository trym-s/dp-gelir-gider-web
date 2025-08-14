import React, { useEffect } from 'react';
// HATA 1 DÜZELTME: 'Select' bileşeni import listesine eklendi.
import { Form, Input, Button, DatePicker, InputNumber, Row, Col, Typography, Alert, Space, Select } from "antd";
import { DollarCircleOutlined, CalendarOutlined, InfoCircleOutlined } from '@ant-design/icons';
import dayjs from "dayjs";

const { TextArea } = Input;
const { Text } = Typography;
const { Option } = Select; // Artık bu satır hata vermeyecek.

const SYMBOLS = { TRY: '₺', USD: '$', EUR: '€', GBP: '£', AED: 'AED' };

export default function ReceiptForm({ onFinish, onCancel, income }) {
    const [form] = Form.useForm();

    const remainingAmount = income ? (parseFloat(income.total_amount) - parseFloat(income.received_amount)).toFixed(2) : 0;
    const incomeCurrency = income?.currency || 'TRY';
    // HATA 2 DÜZELTME: 'initialAmount' değişkeni burada doğru şekilde tanımlandı.
    const initialAmount = parseFloat(remainingAmount) > 0 ? parseFloat(remainingAmount) : 0.01;

    useEffect(() => {
        if (income) {
            form.setFieldsValue({
                receipt_date: dayjs(),
                currency: income.currency,
                receipt_amount: initialAmount,
            });
        }
    }, [income, form, initialAmount]);

    const handleFormSubmit = (values) => {
        const formattedValues = {
            ...values,
            receipt_date: values.receipt_date ? values.receipt_date.format("YYYY-MM-DD") : null,
        };
        onFinish(formattedValues);
    };

    // Para birimi değiştirildiğinde tutar alanını akıllıca yöneten fonksiyon eklendi.
    const handleCurrencyChange = (selectedCurrency) => {
        if (selectedCurrency === incomeCurrency) {
            form.setFieldsValue({ receipt_amount: initialAmount });
        } else {
            form.setFieldsValue({ receipt_amount: undefined });
        }
    };

    if (!income) return null;

    return (
        <Form
            layout="vertical"
            form={form}
            onFinish={handleFormSubmit}
        >
            <Alert
                message={<Text strong>{income.invoice_name || income.description}</Text>}
                description={
                    <>
                        <Text>
                            Bu gelirden kalan alacak: <Text strong>{remainingAmount} {SYMBOLS[incomeCurrency]}</Text>
                        </Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                            (Not: Bu bakiye, farklı para birimlerinde yapılmış tahsilatları içermez.)
                        </Text>
                    </>
                }
                type="info"
                showIcon
                icon={<InfoCircleOutlined />}
                style={{ marginBottom: 24 }}
            />
            
            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item
                        label="Tahsilat Tutarı"
                        name="receipt_amount"
                        rules={[{ required: true, message: 'Lütfen tahsilat tutarını girin.' }]}
                    >
                        <InputNumber
                            style={{ width: "100%" }}
                            min={0.01}
                            placeholder="0.00"
                            addonBefore={<DollarCircleOutlined />}
                            addonAfter={
                                <Form.Item name="currency" noStyle>
                                    <Select 
                                        style={{ width: 85 }}
                                        onChange={handleCurrencyChange}
                                    >
                                        <Option value="TRY">₺ TRY</Option>
                                        <Option value="USD">$ USD</Option>
                                        <Option value="EUR">€ EUR</Option>
                                        <Option value="GBP">£ GBP</Option>
                                        <Option value="AED">AED</Option>
                                    </Select>
                                </Form.Item>
                            }
                            autoFocus
                        />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        label="Tahsilat Tarihi"
                        name="receipt_date"
                        rules={[{ required: true, message: 'Lütfen bir tarih seçin.' }]}
                    >
                        <DatePicker 
                            style={{ width: "100%" }} 
                            format="DD/MM/YYYY" 
                            suffixIcon={<CalendarOutlined />}
                        />
                    </Form.Item>
                </Col>
            </Row>

            <Form.Item label="Açıklama" name="notes">
                <TextArea rows={3} placeholder="Tahsilat ile ilgili notlar... (Opsiyonel)"/>
            </Form.Item>
            
            <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
                <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                    <Button onClick={onCancel} size="large">
                        İptal
                    </Button>
                    <Button type="primary" htmlType="submit" size="large">
                        Tahsilatı Kaydet
                    </Button>
                </Space>
            </Form.Item>
        </Form>
    );
}