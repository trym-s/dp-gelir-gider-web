import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, InputNumber, Select, message, Tag } from 'antd';
import { getKmhAccounts, createKmhLimit, updateKmhAccount, deleteKmhLimit } from '../../api/KMHStatusService';
import { getBankAccounts } from '../../api/bankAccountService';
import { getAccountsForSelection } from '../../api/bankAccountService';

const { Option } = Select;

const KMHTab = () => {
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const [modal, contextHolder] = Modal.useModal();


  const simpleTest = () => {
    alert('TEST BAŞARILI!');
  };

  const fetchAll = async () => {
    console.log("1. fetchAll fonksiyonu başladı.");
    setLoading(true);
    try {
      // API isteklerini ayrı ayrı yapıp kontrol edelim
      console.log("2. KMH hesapları isteniyor...");
      const kmhData = await getKmhAccounts();
      console.log("3. KMH hesapları geldi:", kmhData);
      setList(kmhData);

      console.log("4. Seçim için banka hesapları isteniyor...");
      const accRes = await getAccountsForSelection();
      // Gelen tam API yanıtını görelim
      console.log("5. Banka hesapları API yanıtı geldi:", accRes);

      // State'e atanacak olan asıl veriyi görelim (accRes.data)
      const accountsData = accRes.data || [];
      console.log("6. State'e atanacak veri:", accountsData);
      setAccounts(accountsData);

      console.log("7. State'ler başarıyla güncellendi.");

    } catch (error) {
      // ÖNEMLİ: Hatanın ne olduğunu konsola yazdıralım!
      console.error("!!! FETCHALL İÇİNDE BİR HATA YAKALANDI !!!", error);
      message.error('Veri alımında bir hata oluştu. Lütfen konsolu kontrol edin.');
    } finally {
      setLoading(false);
      console.log("9. fetchAll fonksiyonu tamamlandı.");
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    form.setFieldsValue({
      bank_account_id: undefined,                  // edit’te değiştirmiyoruz (opsiyonel isterseniz açarsınız)
      name: row.name,
      kmh_limit: row.kmh_limit,
      status: row.status,
    });
    setIsModalOpen(true);
  };

  const onOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      if (editing) {
        // Güncelleme
        await updateKmhAccount(editing.id, {
          kmh_limit: values.kmh_limit,
          status: values.status,
        });
        message.success('KMH limiti güncellendi.');
      } else {
        // Ekleme
        await createKmhLimit({
          bank_account_id: values.bank_account_id,
          name: values.name,
          kmh_limit: values.kmh_limit,
        });
        message.success('KMH limiti oluşturuldu.');
      }
      setIsModalOpen(false);
      await fetchAll();
    } catch (e) {
      // validate veya api
      if (!e.errorFields) message.error(e?.response?.data?.error || 'İşlem sırasında hata oluştu.');
    } finally {
      setLoading(false);
    }
  };


  const onDelete = (row) => {
    // Artık static Modal yerine hook'tan gelen modal'ı kullanıyoruz
    console.log("Silinecek satırın verisi:", row);

    modal.confirm({
      title: 'Silinsin mi?',
      content: `${row.bank_name} / ${row.name} KMH kaydı silinecek.`,
      okText: 'Sil',
      okButtonProps: { danger: true },
      cancelText: 'İptal',
      onOk: async () => {
        setLoading(true);
        try {
          await deleteKmhLimit(row.id);
          message.success('KMH limiti silindi.');
          await fetchAll();
        } catch {
          message.error('Silme sırasında hata oluştu.');
        } finally {
          setLoading(false);
        }
      }
    });
  };


  const statusColor = (s) => s === 'Aktif' ? 'green' : (s === 'Pasif' ? 'orange' : 'red');

  const columns = [
    { title: 'Banka', dataIndex: 'bank_name', key: 'bank_name' },
    { title: 'KMH Adı', dataIndex: 'name', key: 'name' },
    {
      title: 'Limit', dataIndex: 'kmh_limit', key: 'kmh_limit',
      render: v => (v ?? 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })
    },
    { title: 'Durum', dataIndex: 'status', key: 'status', render: s => <Tag color={statusColor(s)}>{s}</Tag> },
    {
      title: 'İşlemler', key: 'actions', render: (_, row) => (
        <Space>
          <Button type="link" onClick={() => openEdit(row)}>Düzenle</Button>
          <Button type="link" danger onClick={() => onDelete(row)}>Sil</Button> {/* <-- DOĞRUSU BU */}
        </Space>
      )
    }
  ];

  return (
    <>

      {contextHolder}
      <Button type="primary" onClick={openCreate} style={{ marginBottom: 16 }}>Yeni KMH Ekle</Button>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={list} />

      <Modal
        title={editing ? 'KMH Düzenle' : 'Yeni KMH Ekle'}
        open={isModalOpen}
        onOk={onOk}
        onCancel={() => setIsModalOpen(false)}
        okText="Kaydet" cancelText="İptal"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          {!editing && (
            <>
              <Form.Item name="bank_account_id" label="Banka Hesabı" rules={[{ required: true, message: 'Hesap seçin' }]}>
                <Select placeholder="Banka hesabı seçin" showSearch optionFilterProp="label">
                  {accounts.map(a => (
                    <Option
                      key={a.id}
                      value={a.id}
                      label={`${a.bank?.name || ''} • ${a.name}`}
                    >
                      {(a.bank?.name || '') + ' • ' + a.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="name" label="KMH Adı" rules={[{ required: true, message: 'Ad girin' }]}>
                <Input />
              </Form.Item>
            </>
          )}
          <Form.Item name="kmh_limit" label="KMH Limiti" rules={[{ required: true, message: 'Limit girin' }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          {editing && (
            <Form.Item name="status" label="Durum" rules={[{ required: true }]}>
              <Select>
                <Option value="Aktif">Aktif</Option>
                <Option value="Pasif">Pasif</Option>
                <Option value="Bloke">Bloke</Option>
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </>
  );
};

export default KMHTab;
