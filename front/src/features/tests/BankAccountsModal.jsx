// BankAccountsModal.jsx - SON HALİ

import React, { useState, useEffect } from 'react';
import { Modal, List, Typography, Button, message, Tag, Space, Form, Select, Input, DatePicker, Collapse, Timeline, Spin } from 'antd'; // Spin eklendi
import { CopyOutlined, EditOutlined, ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getStatusHistoryForBankAccount, saveBankAccountStatus } from '../../api/bankAccountService';
import './BankAccountsModal.css';

const { Text, Title } = Typography;
const { Option } = Select;
const { Panel } = Collapse;

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
  
  // YENİ: Durum geçmişi verilerini tutmak için state
  const [historyData, setHistoryData] = useState({}); // { accountId1: [...], accountId2: [...] }
  const [historyLoading, setHistoryLoading] = useState({}); // { accountId1: true, accountId2: false }

  if (!bank) return null;

  
  // Collapse paneli açıldığında ilgili hesabın geçmişini API'den çek
  const handlePanelChange = async (activeKey) => {
    const accountId = activeKey;
    if (!accountId || historyData[accountId]) { // Panel kapandıysa veya veri zaten varsa işlem yapma
      return;
    }
    
    setHistoryLoading(prev => ({ ...prev, [accountId]: true }));
    try {
      const data = await getStatusHistoryForBankAccount(accountId);
      setHistoryData(prev => ({ ...prev, [accountId]: data }));
    } catch (error) {
      message.error("Durum geçmişi yüklenemedi.");
    } finally {
      setHistoryLoading(prev => ({ ...prev, [accountId]: false }));
    }
  };
  const statusToColorMap = {
    'Aktif': 'green',
    'Pasif': 'red',
    'Bloke': 'purple'
  };
  const handleChangeStatusClick = (e, account) => {
    e.stopPropagation();
    setSelectedAccount(account);
    setIsStatusModalVisible(true);
  };

  const handleSaveStatus = async (accountId, values) => {
    const payload = {
      bank_account_id: accountId,
      status: values.status,
      start_date: values.start_date.format('YYYY-MM-DD'),
      end_date: values.end_date ? values.end_date.format('YYYY-MM-DD') : null,
      reason: values.reason,
    };
    
    try {
      await saveBankAccountStatus(payload);
      message.success('Hesap durumu başarıyla güncellendi!');
      setIsStatusModalVisible(false); // Modal'ı kapat
      onDataUpdate(); // Ana sayfadaki veriyi yenilemek için parent component'i uyar!
    } catch (error) {
      message.error("Durum güncellenirken bir hata oluştu.");
    }
  };

  const stopPropagation = (e) => e.stopPropagation();

  return (
    <>
      <Modal title={<Title level={4} style={{ margin: 0 }}>{bank.name} - Hesap Detayları</Title>} visible={visible} onCancel={onCancel} footer={null} width={800} className="bank-accounts-modal">
        <Collapse ghost accordion className="accounts-list-collapse" onChange={handlePanelChange}>
          {(bank.accounts || []).map(account => (
            <Panel
              key={account.id}
              className="account-details-panel"
              header={
                <div className="account-panel-header" onClick={stopPropagation}>
                  <Space align="center">
                    <Text strong>{account.name}</Text>
                    <Text copyable={{ text: account.iban_number }}>{account.iban_number}</Text>
                  </Space>
                  <Space>
                    <Tag>{account.status}</Tag> {/* Bu status artık backend'den geliyor! */}
                    <Button type="link" icon={<EditOutlined />} onClick={(e) => handleChangeStatusClick(e, account)}>
                      Durum Değiştir
                    </Button>
                  </Space>
                </div>
              }
            >
              <div className="status-history-container">
                <Title level={5}>Durum Geçmişi</Title>
                {historyLoading[account.id] ? <Spin /> : (
                  <Timeline>
                    {(historyData[account.id] || []).length > 0 ? (
                        (historyData[account.id] || []).map(historyItem => (
                        <Timeline.Item key={historyItem.id} dot={<ClockCircleOutlined />} color={statusToColorMap[historyItem.status] || 'blue'}>
                          <p><strong>{historyItem.status}</strong> ({dayjs(historyItem.start_date).format('DD.MM.YYYY')}
                            {historyItem.end_date ? ` - ${dayjs(historyItem.end_date).format('DD.MM.YYYY')}` : ''})
                          </p>
                          <p><Text type="secondary">{historyItem.reason}</Text></p>
                        </Timeline.Item>
                      ))
                    ) : (
                        <Text type="secondary">Bu hesap için durum geçmişi bulunmuyor.</Text>
                    )}
                  </Timeline>
                )}
              </div>
            </Panel>
          ))}
        </Collapse>
      </Modal>

      <ChangeStatusModal visible={isStatusModalVisible} onCancel={() => setIsStatusModalVisible(false)} onSave={handleSaveStatus} account={selectedAccount} />
    </>
  );
};

export default BankAccountsModal;