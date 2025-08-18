import { bankLogoMap } from '../../icons/bankLogoMap';

import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, InputNumber, Select, message, Tag } from 'antd';
import { getKmhAccounts, createKmhLimit, updateKmhAccount, deleteKmhLimit } from '../../api/KMHStatusService';
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

  const fetchAll = async () => {
    setLoading(true);
    try {
      const kmhData = await getKmhAccounts();
      setList(kmhData);

      const accRes = await getAccountsForSelection();
      const accountsData = accRes.data || [];
      setAccounts(accountsData);
    } catch (error) {
      console.error("fetchAll error:", error);
      message.error('Veri alımında bir hata oluştu. Konsolu kontrol edin.');
    } finally {
      setLoading(false);
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
      bank_account_id: undefined, // not editable on update
      name: row.name,
      kmh_limit: row.kmh_limit,
      // status removed from edit flow
    });
    setIsModalOpen(true);
  };

  const onOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      if (editing) {
        // UPDATE: only kmh_limit is updatable; status removed
        await updateKmhAccount(editing.id, {
          kmh_limit: values.kmh_limit,
        });
        message.success('KMH limiti güncellendi.');
      } else {
        // CREATE
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
      if (!e.errorFields) message.error(e?.response?.data?.error || 'İşlem sırasında hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const onDelete = (row) => {
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

  const statusColor = (s) => (s === 'Aktif' ? 'green' : (s === 'Pasif' ? 'orange' : 'red'));

  const columns = [
    {
      title: 'Banka',
      dataIndex: 'bank_name',
      key: 'bank_name',
      render: (name) => {
        const src = bankLogoMap[name] || bankLogoMap.default;
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <img src={src} alt={name} style={{ width: 20, height: 20, objectFit: 'contain' }} />
            {name}
          </span>
        );
      },
    },
    {
      title: 'KMH Adı',
      dataIndex: 'name',
      key: 'name',
      render: (name, row) => (
        <span>
          {name}
          {row.bank_account_name ? (
            <span style={{ color: '#888', marginLeft: 8 }}>
              • {row.bank_account_name}
            </span>
          ) : null}
        </span>
      )
    },
    {
      title: 'Limit',
      dataIndex: 'kmh_limit',
      key: 'kmh_limit',
      render: v => (v ?? 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })
    },
    {
      title: 'Durum',
      dataIndex: 'status',
      key: 'status',
      render: s => <Tag color={statusColor(s)}>{s}</Tag>
    },
    {
      title: 'İşlemler',
      key: 'actions',
      render: (_, row) => (
        <Space>
          <Button type="link" onClick={() => openEdit(row)}>Düzenle</Button>
          <Button type="link" danger onClick={() => onDelete(row)}>Sil</Button>
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
        okText="Kaydet"
        cancelText="İptal"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          {!editing && (
            <>
              <Form.Item
                name="bank_account_id"
                label="Banka Hesabı"
                rules={[{ required: true, message: 'Hesap seçin' }]}
              >
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
              <Form.Item
                name="name"
                label="KMH Adı"
                rules={[{ required: true, message: 'Ad girin' }]}
              >
                <Input />
              </Form.Item>
            </>
          )}

          <Form.Item
            name="kmh_limit"
            label="KMH Limiti"
            rules={[{ required: true, message: 'Limit girin' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          {/* status form item removed in edit mode by design */}
        </Form>
      </Modal>
    </>
  );
};

export default KMHTab;

