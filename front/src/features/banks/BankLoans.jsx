import React, { useState } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Row,
  Col,
  Typography,
  Divider,
  message,
  Tag,
  Popconfirm
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, DollarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import './BankLoans.css';

const { Title, Text  } = Typography;
const { Option } = Select;

const initialLoans = [
  {
    key: 1,
    bank: 'AKBANK',
    loanType: 'TAKSİTLİ TİCARİ KREDİ',
    description: '',
    amount: 51532,
    monthlyRate: 4.09,
    yearlyRate: 49.08,
    issueDate: dayjs(),
    dueDate: null,
    installmentCount: 12,
    totalDebt: 46070.06,
    totalPaid: 0,
    monthlyPayment: 3839.17,
  },
];

const bankOptions = ['AKBANK', 'VAKIFBANK', 'ZİRAAT'];
const loanTypeOptions = ['ROTATİF', 'İŞLETME KREDİSİ', 'TAKSİTLİ TAŞIT KREDİSİ'];

export default function BankLoans() {
  const [data, setData] = useState(initialLoans);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [banks, setBanks] = useState(bankOptions);
  const [loanTypes, setLoanTypes] = useState(loanTypeOptions);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newSelectItem, setNewSelectItem] = useState('');
  const [newSelectType, setNewSelectType] = useState('');
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);

  const handleAddLoan = () => {
    form
      .validateFields()
      .then((values) => {
        const amount = parseFloat(values.amount);
        const totalDebt = parseFloat(values.totalDebt);

        if (totalDebt < amount) {
          message.error('Geri ödenecek toplam, kullanım miktarından az olamaz.');
          return;
        }

        const newLoan = {
          key: Date.now(),
          ...values,
          issueDate: values.issueDate,
          dueDate: values.dueDate,
          totalDebt: values.totalDebt,
          monthlyPayment: values.monthlyPayment,
          totalPaid: 0,
        };

        setData((prev) => [...prev, newLoan]);
        setModalOpen(false);
        form.resetFields();
      })
      .catch((errorInfo) => {
        console.warn('Form doğrulama hatası:', errorInfo);
        // message.error('Lütfen tüm gerekli alanları doldurun.');
      });
  };


  const handleBankChange = (value) => {
    if (value === '+') {
      setNewSelectType('bank');
      setAddModalOpen(true);
    }
  };

  const handleLoanTypeChange = (value) => {
    if (value === '+') {
      setNewSelectType('loanType');
      setAddModalOpen(true);
    }
  };

  const handleAddSelectItem = () => {
    if (!newSelectItem.trim()) return;
    if (newSelectType === 'bank') {
      setBanks([...banks, newSelectItem]);
      form.setFieldsValue({ bank: newSelectItem });
    } else if (newSelectType === 'loanType') {
      setLoanTypes([...loanTypes, newSelectItem]);
      form.setFieldsValue({ loanType: newSelectItem });
    }
    setNewSelectItem('');
    setAddModalOpen(false);
  };

  const showLoanDetails = (record) => {
    setSelectedLoan(record);
    setDetailVisible(true);
  };

  const handleDelete = () => {
    setData((prev) => prev.filter((item) => item.key !== selectedLoan.key));
    setDetailVisible(false);
  };

  const columns = [
    { title: 'BANKA', dataIndex: 'bank', key: 'bank' },
    { title: 'KREDİ TÜRÜ', dataIndex: 'loanType', key: 'loanType' },
    { title: 'AÇIKLAMA', dataIndex: 'description', key: 'description' },
    { title: 'KULLANIM MİKTARI', dataIndex: 'amount', key: 'amount', render: (val) => `₺${val.toLocaleString('tr-TR')}` },
    { title: 'AYLIK FAİZ O.', dataIndex: 'monthlyRate', key: 'monthlyRate', render: (val) => `%${val}` },
    { title: 'YILLIK FAİZ O.', dataIndex: 'yearlyRate', key: 'yearlyRate', render: (val) => `%${val}` },
    { title: 'ÇEKİLDİĞİ GÜN', dataIndex: 'issueDate', key: 'issueDate', render: (val) => dayjs(val).format('DD.MM.YYYY') },
    { title: 'ÖDEME GÜNÜ', dataIndex: 'dueDate', key: 'dueDate', render: (val) => val ? dayjs(val).format('DD.MM.YYYY') : '' },
    { title: 'TAKSİT SAYISI', dataIndex: 'installmentCount', key: 'installmentCount' },
    { title: 'TOPLAM BORÇ', dataIndex: 'totalDebt', key: 'totalDebt', render: (val) => `₺${val.toLocaleString('tr-TR')}` },
    { title: 'AYLIK ÖDEME', dataIndex: 'monthlyPayment', key: 'monthlyPayment', render: (val) => `₺${Number(val).toLocaleString('tr-TR')}` },
    { title: 'TOPLAM ÖDENEN', dataIndex: 'totalPaid', key: 'totalPaid', render: (val) => `₺${val.toLocaleString('tr-TR')}` },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle">
        <Title level={3}>Kredi Listesi</Title>
        <Button icon={<PlusOutlined />} type="primary" onClick={() => setModalOpen(true)}>Kredi Ekle</Button>
      </Row>

      <Divider />

      <Table 
        columns={columns} 
        dataSource={data} 
        bordered 
        pagination={false}
        onRow={(record) => ({
          onClick: () => showLoanDetails(record), // satıra tıklayınca detay açılır
          style: { cursor: 'pointer' },
        })}
        rowClassName="clickable-row" 
      />
      <Modal
        open={detailVisible}
        title={<Title level={4}>Kredi Detayı</Title>}
        onCancel={() => setDetailVisible(false)}
        footer={[
          <Popconfirm title="Emin misiniz?" onConfirm={handleDelete} okText="Evet" cancelText="İptal">
            <Button danger icon={<DeleteOutlined />}>Sil</Button>
          </Popconfirm>,
          <Button type="default" icon={<EditOutlined />}>Düzenle</Button>,
          <Button type="primary" icon={<DollarOutlined />}>Ödeme Yap</Button>,
        ]}
        width={700}
      >
        {selectedLoan && (
          <div>
            <Row gutter={16}>
              <Col span={12}><Text strong>Banka:</Text> <br />{selectedLoan.bank}</Col>
              <Col span={12}><Text strong>Kredi Türü:</Text> <br />{selectedLoan.loanType}</Col>
            </Row>
            <Divider />
            <Row gutter={16}>
              <Col span={8}><Text strong>Kullanım Miktarı:</Text><br />₺{selectedLoan.amount.toLocaleString('tr-TR')}</Col>
              <Col span={8}><Text strong>Geri Ödenecek:</Text><br />₺{selectedLoan.totalDebt.toLocaleString('tr-TR')}</Col>
              <Col span={8}><Text strong>Aylık Ödeme:</Text><br />₺{Number(selectedLoan.monthlyPayment).toLocaleString('tr-TR')}</Col>
            </Row>
            <Divider />
            <Row gutter={16}>
              <Col span={8}><Text strong>Faiz (Aylık):</Text> %{selectedLoan.monthlyRate}</Col>
              <Col span={8}><Text strong>Faiz (Yıllık):</Text> %{selectedLoan.yearlyRate}</Col>
              <Col span={8}><Text strong>Taksit:</Text> {selectedLoan.installmentCount}</Col>
            </Row>
            <Divider />
            <Row gutter={16}>
              <Col span={12}><Text strong>Çekildiği Gün:</Text> {dayjs(selectedLoan.issueDate).format('DD MMMM YYYY')}</Col>
              <Col span={12}><Text strong>Ödeme Günü:</Text> {dayjs(selectedLoan.dueDate).format('DD MMMM YYYY')}</Col>
            </Row>
            <Divider />
            <Row>
              <Col span={24}>
                <Text strong>Durum: </Text>
                {selectedLoan.totalPaid >= selectedLoan.totalDebt ? (
                  <Tag color="green">Ödendi</Tag>
                ) : (
                  <Tag color="red">Ödenmedi</Tag>
                )}
              </Col>
            </Row>
          </div>
        )}
      </Modal>
      <Modal
        open={modalOpen}
        title="Yeni Kredi Ekle"
        onOk={handleAddLoan}
        onCancel={() => setModalOpen(false)}
        okText="Ekle"
        cancelText="İptal"
        width={800}
      >
        <Form layout="vertical" form={form}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Banka Adı" name="bank" rules={[{ required: true }]}> 
                <Select placeholder="Banka seçin" onChange={handleBankChange}>
                  {banks.map((bank) => <Option key={bank} value={bank}>{bank}</Option>)}
                  <Option value="+">+ Yeni Banka Ekle</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Kredi Türü" name="loanType" rules={[{ required: true }]}> 
                <Select placeholder="Kredi türü seçin" onChange={handleLoanTypeChange}>
                  {loanTypes.map((type) => <Option key={type} value={type}>{type}</Option>)}
                  <Option value="+">+ Yeni Tür Ekle</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Açıklama" name="description">
                <Input placeholder="Varsa açıklama girin" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Kullanım Miktarı (₺)" name="amount" rules={[{ required: true }]}> 
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  formatter={val => `₺${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                  parser={val => val.replace(/₺|\./g, '')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Geri Ödenecek Toplam (₺)" name="totalDebt" rules={[{ required: true, message: 'Geri ödenecek toplam zorunludur' }]}>
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  formatter={val => `₺${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                  parser={val => val.replace(/₺|\./g, '')}
                  onChange={(value) => {
                    const count = form.getFieldValue('installmentCount');
                    if (count && count > 0) {
                      form.setFieldsValue({
                        monthlyPayment: (value / count).toFixed(2),
                      });
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Aylık Ödenecek Tutar (₺)" name="monthlyPayment">
                <InputNumber
                  disabled
                  style={{ width: '100%' }}
                  formatter={val => `₺${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                  parser={val => val.replace(/₺|\./g, '')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Aylık Faiz (%)" name="monthlyRate" rules={[{ required: true, message: 'Aylık faiz oranı zorunludur' }]}>
                <InputNumber min={0} step={0.01} precision={2} style={{ width: '100%' }} formatter={val => `%${val}`} parser={val => val.replace('%', '')} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Yıllık Faiz (%)" name="yearlyRate" rules={[{ required: true, message: 'Yıllık faiz oranı zorunludur' }]}>
                <InputNumber min={0} step={0.01} precision={2} style={{ width: '100%' }} formatter={val => `%${val}`} parser={val => val.replace('%', '')} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Taksit Sayısı" name="installmentCount" rules={[{ required: true, message: 'Taksit sayısı zorunludur' }]}>
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  onChange={(value) => {
                    const debt = form.getFieldValue('totalDebt');
                    if (debt && value > 0) {
                      form.setFieldsValue({
                        monthlyPayment: (debt / value).toFixed(2),
                      });
                    }
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Çekildiği Gün" name="issueDate" rules={[{ required: true, message: 'Çekildiği tarih zorunludur' }]}>
                <DatePicker
                  format="DD.MM.YYYY"
                  style={{ width: '100%' }}
                  disabledDate={(current) => current && current > dayjs().endOf('day')}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Ödeme Günü" name="dueDate" rules={[{ required: true, message: 'Ödeme günü zorunludur' }]}>
                <DatePicker
                  format="DD.MM.YYYY"
                  style={{ width: '100%' }}
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title={newSelectType === 'bank' ? 'Yeni Banka Ekle' : 'Yeni Kredi Türü Ekle'}
        open={addModalOpen}
        onOk={handleAddSelectItem}
        onCancel={() => setAddModalOpen(false)}
        okText="Ekle"
        cancelText="İptal"
      >
        <Input
          placeholder={newSelectType === 'bank' ? 'Banka Adı' : 'Kredi Türü'}
          value={newSelectItem}
          onChange={(e) => setNewSelectItem(e.target.value)}
        />
      </Modal>
    </div>
  );
}