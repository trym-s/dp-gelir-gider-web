import React from 'react';
import { Table, Button, Alert, Checkbox, Typography, Tag } from 'antd';

const { Text } = Typography;

const TransactionConfirmationStep = ({ transactions, selectedRowKeys, onSelectionChange, onBack, onImport, onCancel }) => {
  const validTransactions = transactions.filter(t => t.status === 'valid');
  const invalidTransactions = transactions.filter(t => t.status !== 'valid');

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      onSelectionChange(validTransactions.map(t => t.key));
    } else {
      onSelectionChange([]);
    }
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectionChange,
    getCheckboxProps: (record) => ({
      disabled: record.status !== 'valid',
    }),
  };

  const columns = [
    {
      title: 'Tarih',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: 'Açıklama',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Tutar',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (text) => `${text} TL`,
    },
    {
      title: 'Durum',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => (
        status === 'valid' ? 
        <Tag color="green">Uygun</Tag> : 
        <Tag color="red">{record.error}</Tag>
      ),
    },
  ];

  const isAllValidSelected = selectedRowKeys.length === validTransactions.length && validTransactions.length > 0;

  return (
    <div>
      <Alert
        message={`${transactions.length} işlem bulundu. ${validTransactions.length} tanesi içe aktarılmaya uygun, ${invalidTransactions.length} tanesi hatalı.`}
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      <div style={{ marginBottom: 16 }}>
        <Checkbox
          indeterminate={selectedRowKeys.length > 0 && !isAllValidSelected}
          checked={isAllValidSelected}
          onChange={handleSelectAll}
          disabled={validTransactions.length === 0}
        >
          Tümünü Seç/Kaldır
        </Checkbox>
      </div>
      <Table
        rowSelection={rowSelection}
        columns={columns}
        dataSource={transactions}
        pagination={false}
        rowClassName={(record) => record.status !== 'valid' ? 'ant-table-row-error' : ''}
      />
       <style jsx global>{`
        .ant-table-row-error > td {
          background: #fff1f0 !important;
        }
      `}</style>
      <div style={{ marginTop: 24, textAlign: 'right' }}>
        <Button style={{ marginRight: 8 }} onClick={onBack}>
          Geri
        </Button>
        <Button style={{ marginRight: 8 }} onClick={onCancel}>
          İptal
        </Button>
        <Button type="primary" onClick={onImport} disabled={selectedRowKeys.length === 0}>
          {selectedRowKeys.length} İşlemi İçe Aktar
        </Button>
      </div>
    </div>
  );
};

export default TransactionConfirmationStep;
