import React from 'react';
import { List, Checkbox, Typography, Tag, Alert } from 'antd';
import { CalendarOutlined, InfoCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { formatCurrency } from '../../utils/cardUtils';

const { Text,Title, Paragraph } = Typography;

const ReviewStep = ({ processedRows, selectedRowKeys, onSelectionChange }) => {
  const validRows = processedRows.filter(r => r.status === 'valid');
  const invalidRows = processedRows.filter(r => r.status === 'invalid');

  const onSelectAllChange = (e) => {
    onSelectionChange(e.target.checked ? validRows.map(r => r.key) : []);
  };

  return (
    <div style={{ width: '100%' }}>
      <Alert
        message={`${validRows.length} uygun, ${invalidRows.length} hatalı işlem bulundu.`}
        description="Lütfen içe aktarmak istediğiniz işlemleri kontrol edip seçin."
        type="success"
        style={{ marginBottom: 24 }}
      />

      {/* Geçerli Satırlar Listesi */}
      <Title level={5}>Onay Bekleyenler ({validRows.length})</Title>
      <Checkbox
        indeterminate={selectedRowKeys.length > 0 && selectedRowKeys.length < validRows.length}
        onChange={onSelectAllChange}
        checked={selectedRowKeys.length === validRows.length && validRows.length > 0}
        style={{ marginBottom: 16 }}
        disabled={validRows.length === 0}
      >
        Tümünü Seç
      </Checkbox>
      <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '16px' }}>
        <List
          itemLayout="horizontal"
          dataSource={validRows}
          renderItem={item => (
            <List.Item
              style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '8px', marginBottom: '8px', padding: '12px' }}
              actions={[<Text strong>{formatCurrency(item.amount)}</Text>]}
            >
              <Checkbox
                style={{ marginRight: 16 }}
                checked={selectedRowKeys.includes(item.key)}
                onChange={() => {
                  const newSelection = selectedRowKeys.includes(item.key)
                    ? selectedRowKeys.filter(k => k !== item.key)
                    : [...selectedRowKeys, item.key];
                  onSelectionChange(newSelection);
                }}
              />
              <List.Item.Meta
                title={<Text>{item.description}</Text>}
                description={<><CalendarOutlined style={{marginRight: 8}}/>{item.date}</>}
              />
            </List.Item>
          )}
        />
      </div>

      {/* Hatalı Satırlar Listesi */}
      {invalidRows.length > 0 && (
        <>
          <Title level={5} style={{ marginTop: 24 }}>Hatalı Satırlar ({invalidRows.length})</Title>
          <div style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '16px' }}>
            <List
              itemLayout="horizontal"
              dataSource={invalidRows}
              renderItem={item => (
                <List.Item style={{ background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: '8px', marginBottom: '8px', padding: '12px' }}>
                  <List.Item.Meta
                    avatar={<CloseCircleOutlined style={{ color: '#cf1322', fontSize: '1.2rem' }} />}
                    title={<Text type="danger">{item.error}</Text>}
                    description={`Orijinal Açıklama: ${item.originalData['Açıklama'] || 'Yok'}`}
                  />
                </List.Item>
              )}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default ReviewStep;