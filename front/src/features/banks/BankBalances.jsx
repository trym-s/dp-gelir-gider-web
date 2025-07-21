import React, { useState, useEffect } from 'react';
import {
  Table,
  InputNumber,
  Typography,
  Button,
  Row,
  Col,
  Divider,
  Modal,
  Form,
  Input,
  Space,
  message,
  Popconfirm,
  notification
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import './BankBalances.css';
import {
  getBanks,
  saveBankLogs,
  getBankLogsByDate,
  deleteBank,
  createBank,
} from '../../api/BankBalancesService';

const { Title, Text } = Typography;

export default function BankBalances() {
  const [data, setData] = useState([]);
  const [usdRate, setUsdRate] = useState(0);
  const [eurRate, setEurRate] = useState(0);
  const [isMorning, setIsMorning] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [newBankName, setNewBankName] = useState('');

  useEffect(() => {
    const today = dayjs().format('YYYY-MM-DD');

    async function fetchData() {
      try {
        const bankList = await getBanks();
        let initialData = bankList.map((bank) => ({
          key: bank.id,
          bank: bank.name,
          tl: 0,
          usd: 0,
          eur: 0,
          total: 0,
        }));

        const logs = await getBankLogsByDate(today);

        initialData = initialData.map((item) => {
          const matched = logs.find((log) => log.bank_id === item.key);
          if (!matched) return item;

          const tl = isMorning ? Number(matched.morning_amount_try || 0) : Number(matched.evening_amount_try || 0);
          const usd = isMorning ? Number(matched.morning_amount_usd || 0) : Number(matched.evening_amount_usd || 0);
          const eur = isMorning ? Number(matched.morning_amount_eur || 0) : Number(matched.evening_amount_eur || 0);

          return {
            ...item,
            tl,
            usd,
            eur,
            total: tl + usd * usdRate + eur * eurRate,
          };
        });

        setData(initialData);
      } catch (err) {
        console.error('Banka verileri alınamadı:', err);
      }
    }

    fetchData();
  }, [isMorning, usdRate, eurRate]);

  const handleInputChange = (value, recordKey, field) => {
    const newData = [...data];
    const record = newData.find((item) => item.key === recordKey);
    record[field] = value || 0;
    record.total = (record.tl || 0) + (record.usd || 0) * usdRate + (record.eur || 0) * eurRate;
    setData(newData);
  };

  const handleSave = async () => {
    const today = dayjs().format('YYYY-MM-DD');
    const existingLogs = await getBankLogsByDate(today);

    const logs = data.map((item) => {
      const existing = existingLogs.find((log) => log.bank_id === item.key);

      const updatedLog = {
        bank_id: item.key,
        date: today,
        morning_amount_try: existing?.morning_amount_try || 0,
        evening_amount_try: existing?.evening_amount_try || 0,
        morning_amount_usd: existing?.morning_amount_usd || 0,
        evening_amount_usd: existing?.evening_amount_usd || 0,
        morning_amount_eur: existing?.morning_amount_eur || 0,
        evening_amount_eur: existing?.evening_amount_eur || 0,
      };

      if (isMorning) {
        updatedLog.morning_amount_try = item.tl || 0;
        updatedLog.morning_amount_usd = item.usd || 0;
        updatedLog.morning_amount_eur = item.eur || 0;
      } else {
        updatedLog.evening_amount_try = item.tl || 0;
        updatedLog.evening_amount_usd = item.usd || 0;
        updatedLog.evening_amount_eur = item.eur || 0;
      }

      return updatedLog;
    });

    try {
      await saveBankLogs(logs);
      console.log("Kayıt başarılı");
      notification.success({
        message: 'Kayıt Başarılı',
        description: 'Banka logları başarıyla kaydedildi.',
        duration: 3,
      });
    } catch (error) {
      console.error("Kayıt sırasında hata:", error);
      message.error("Kayıt sırasında bir hata oluştu.");
    }
  };

  const handleAddBank = async () => {
    if (!newBankName.trim()) return;
    try {
      const newBank = await createBank({ name: newBankName.trim() });
      setData([...data, {
        key: newBank.id,
        bank: newBank.name,
        tl: 0,
        usd: 0,
        eur: 0,
        total: 0,
      }]);
      message.success("Yeni banka başarıyla eklendi.");
      setNewBankName('');
      setModalOpen(false);
    } catch (err) {
      message.error("Banka eklenirken hata oluştu.");
    }
  };

  const updateAllTotals = (usd, eur) => {
    const newData = data.map((item) => ({
      ...item,
      total: (item.tl || 0) + (item.usd || 0) * (usd || 0) + (item.eur || 0) * (eur || 0),
    }));
    setData(newData);
  };

  const handleDeleteBank = (key) => {
    const bankToDelete = data.find(item => item.key === key);
    console.log("🧨 Silme işlemi başlatıldı:", bankToDelete); // EKLE
    Modal.confirm({
      title: `"${bankToDelete.bank}" bankasını silmek istiyor musunuz?`,
      content: "Bu işlem geri alınamaz.",
      okText: "Sil",
      okType: "danger",
      cancelText: "Vazgeç",
      onOk: async () => {
        try {
          await deleteBank(key);
          setData(data.filter(item => item.key !== key));
          message.success("Banka başarıyla silindi.");
        } catch (err) {
          message.error("Banka silinemedi.");
        }
      },
    });
  };

  const columns = [
    {
      title: 'Banka',
      dataIndex: 'bank',
      key: 'bank',
      render: (text) => <strong>{text}</strong>,
      width: 200,
    },
    {
      title: 'Toplam Bakiye',
      dataIndex: 'total',
      key: 'total',
      render: (value) => <span>₺{value.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>,
      width: 150,
    },
    {
      title: 'TL Giriş',
      dataIndex: 'tl',
      key: 'tl',
      width: 120,
      render: (value, record) => (
        <InputNumber
          value={value}
          formatter={(val) => `₺${val}`}
          parser={(val) => val.replace('₺', '')}
          onChange={(val) => handleInputChange(val, record.key, 'tl')}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: (
        <Space>
          <span style={{ fontWeight: 500 }}>USD Giriş</span>
          <InputNumber
            value={usdRate}
            min={0}
            onChange={(val) => {
              setUsdRate(val);
              updateAllTotals(val, eurRate);
            }}
            precision={3}
            size="small"
            style={{ width: 100 }}
          />
        </Space>
      ),
      dataIndex: 'usd',
      key: 'usd',
      width: 120,
      render: (value, record) => (
        <InputNumber
          value={value}
          formatter={(val) => `$${val}`}
          parser={(val) => val.replace('$', '')}
          onChange={(val) => handleInputChange(val, record.key, 'usd')}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: (
        <Space>
          <span style={{ fontWeight: 500 }}>EUR Giriş</span>
          <InputNumber
            value={eurRate}
            min={0}
            onChange={(val) => {
              setEurRate(val);
              updateAllTotals(usdRate, val);
            }}
            precision={3}
            size="small"
            style={{ width: 100 }}
          />
        </Space>
      ),
      dataIndex: 'eur',
      key: 'eur',
      width: 120,
      render: (value, record) => (
        <InputNumber
          value={value}
          formatter={(val) => `€${val}`}
          parser={(val) => val.replace('€', '')}
          onChange={(val) => handleInputChange(val, record.key, 'eur')}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: '',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Popconfirm
            title={`"${record.bank}" bankasını silmek istiyor musunuz?`}
            onConfirm={() => handleDeleteBank(record.key)}
            okText="Sil"
            cancelText="Vazgeç"
          >
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
      width: 60,
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle">
        <Title level={3}>Günlük Banka Bakiyeleri</Title>
        <Button icon={<PlusOutlined />} type="primary" onClick={() => setModalOpen(true)}>
          Banka Ekle
        </Button>
      </Row>

      <Row gutter={16} align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Button
            className={`time-toggle-button ${isMorning ? 'active' : ''}`}
            onClick={() => setIsMorning(true)}
          >
            Sabah
          </Button>
        </Col>
        <Col>
          <Button
            className={`time-toggle-button ${!isMorning ? 'active' : ''}`}
            onClick={() => setIsMorning(false)}
          >
            Akşam
          </Button>
        </Col>
        <Col>
          <Text type="secondary">
            {dayjs().format('D MMMM YYYY HH.mm')}
          </Text>
        </Col>
      </Row>



      <Divider />

      <Table
        dataSource={data}
        columns={columns}
        pagination={false}
        bordered
        scroll={{ x: true }}
        rowClassName={() => 'hoverable-row'}
      />

      <Row justify="end" style={{ marginTop: 24 }}>
        <Button type="primary" onClick={handleSave}>
          Kaydet
        </Button>
      </Row>

      <Modal
        title="Yeni Banka Ekle"
        open={modalOpen}
        onOk={handleAddBank}
        onCancel={() => setModalOpen(false)}
        okText="Ekle"
        cancelText="İptal"
      >
        <Form layout="vertical">
          <Form.Item label="Banka Adı">
            <Input
              value={newBankName}
              onChange={(e) => setNewBankName(e.target.value)}
              placeholder="Örn: Albaraka Türk"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
