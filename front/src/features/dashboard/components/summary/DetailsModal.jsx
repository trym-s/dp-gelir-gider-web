import React from 'react';
import { Modal, Table, Spin, Row } from 'antd';

const DetailsModal = ({ isVisible, onCancel, modalContent, isLoading, onRowClick, getRowClassName }) => {
  return (
    <Modal 
      title={modalContent.title} 
      open={isVisible} 
      onCancel={onCancel} 
      footer={null} 
      width={1200} 
      destroyOnClose
    >
      {isLoading ? (
        <Row justify="center" align="middle" style={{ padding: '50px' }}><Spin size="large" /></Row>
      ) : (
        <Table 
          columns={modalContent.columns} 
          dataSource={modalContent.data} 
          rowKey="id" 
          pagination={{ pageSize: 8, size: 'small' }}
          className="details-modal-table"
          rowClassName={getRowClassName}
          onRow={(record) => ({
              onClick: () => onRowClick(record),
              style: { cursor: 'pointer' },
          })}
        />
      )}
    </Modal>
  );
};

export default DetailsModal;
