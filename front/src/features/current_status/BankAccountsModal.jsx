// BankAccountsModal.jsx - status değiştirme

import React, { useState, useEffect } from 'react';
import { Modal, List, Typography, Button, message, Tag, Space, Form, Select, Input, DatePicker } from 'antd';
import { CopyOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getStatusHistoryForBankAccount, saveBankAccountStatus } from '../../api/bankAccountService';
import './BankAccountsModal.css';

const { Text, Title } = Typography;
const { Option } = Select;

// ChangeStatusModal bileşeni aynı kalıyor, değişiklik yok.
const ChangeStatusModal = ({ visible, onCancel, onSave, account }) => {
    // ... Bu component'in kodu öncekiyle aynı ...
    const [form] = Form.useForm();
    const selectedStatus = Form.useWatch('status', form);
    useEffect(() => {if (visible) {form.setFieldsValue({ previous_status: account?.status, status: null, start_date: dayjs(), reason: '', end_date: null});}}, [visible, account, form]);
    const handleSave = () => {form.validateFields().then(values => {onSave(account.id, values);}).catch(info => {console.log('Validation Failed:', info);});};
    if (!account) return null;
    return (<Modal title={`${account.name} - Durum Güncelle`} visible={visible} onCancel={onCancel} onOk={handleSave} okText="Kaydet" cancelText="İptal" destroyOnClose> <Form form={form} layout="vertical"><Form.Item label="Önceki Durum"><Input value={account.status} disabled /></Form.Item><Form.Item name="status" label="Yeni Durum" rules={[{ required: true, message: 'Lütfen yeni durumu seçin!' }]}><Select placeholder="Yeni durumu seçin"><Option value="Aktif">Aktif</Option><Option value="Pasif">Pasif</Option><Option value="Bloke">Bloke</Option></Select></Form.Item><Form.Item name="start_date" label="Başlangıç Tarihi" rules={[{ required: true, message: 'Lütfen başlangıç tarihi seçin!' }]}><DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" /></Form.Item>{selectedStatus === 'Bloke' && (<Form.Item name="end_date" label="Bitiş Tarihi (Zorunlu Değil)"><DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" /></Form.Item>)}<Form.Item name="reason" label="Değişiklik Nedeni" rules={[{ required: selectedStatus !== 'Aktif', message: 'Pasif veya Bloke durumu için neden belirtmek zorunludur!' }]}><Input.TextArea rows={3} placeholder="Durum değişikliğinin nedenini açıklayın..." /></Form.Item></Form></Modal>);
};

// --- ANA BİLEŞEN: BankAccountsModal ---
// onDataUpdate prop'u eklendi
const BankAccountsModal = ({ visible, onCancel, bank, onDataUpdate }) => { 
  const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  

  if (!bank) return null;

  const handleChangeStatusClick = (e, account) => {
    setSelectedAccount(account);
    setIsStatusModalVisible(true);
  };

  const handleSaveStatus = async (accountId, values) => {
    // --- DEĞİŞİKLİK: Payload'ı yeni genel yapıya göre oluşturuyoruz ---
    const payload = {
      subject_id: accountId,         // 'bank_account_id' yerine 'subject_id'
      subject_type: 'bank_account',  // Bu işlemin bir banka hesabı için olduğunu belirtiyoruz
      status: values.status,
      start_date: values.start_date.format('YYYY-MM-DD'),
      end_date: values.end_date ? values.end_date.format('YYYY-MM-DD') : null,
      reason: values.reason,
    };
    
    try {
      // API çağrısı yapan fonksiyonun adını 'saveBankAccountStatus' yerine 'saveStatus' gibi
      // daha genel bir isme değiştirmek isteyebilirsiniz, ama şimdilik çalışacaktır.
      await saveBankAccountStatus(payload);
      message.success('Hesap durumu başarıyla güncellendi!');
      setIsStatusModalVisible(false);
      onDataUpdate(); 
    } catch (error) {
      message.error("Durum güncellenirken bir hata oluştu.");
    }
  };

  const stopPropagation = (e) => e.stopPropagation();

  return (
        <>
            <Modal title={<Title level={4} style={{ margin: 0 }}>{bank.name} - Hesap Detayları</Title>} visible={visible} onCancel={onCancel} footer={null} width={800}>
                {/* List bileşeni ile daha sade bir yapı oluşturuluyor */}
                <List
                    dataSource={bank.accounts || []}
                    renderItem={account => (
                        <List.Item
                            actions={[
                                <Button type="link" icon={<EditOutlined />} onClick={() => handleChangeStatusClick(null, account)}>
                                    Durum Değiştir
                                </Button>
                            ]}
                        >
                            <List.Item.Meta
                                title={
                                    <Space align="center">
                                        <Text strong>{account.name}</Text>
                                        <Text copyable={{ text: account.iban_number }}>{account.iban_number}</Text>
                                    </Space>
                                }
                                description={<Tag>{account.status}</Tag>}
                            />
                        </List.Item>
                    )}
                />
            </Modal>

            <ChangeStatusModal visible={isStatusModalVisible} onCancel={() => setIsStatusModalVisible(false)} onSave={handleSaveStatus} account={selectedAccount} />
        </>
  );
};

export default BankAccountsModal;