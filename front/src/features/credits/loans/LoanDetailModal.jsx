import React from 'react';
import { Modal, Typography } from 'antd';
import ExpandedLoanView from './ExpandedLoanView';
import ProvidedBankLoans from './BankLoans';

const { Title } = Typography;

const LoanDetailModal = ({ loan, visible, onClose }) => {
  if (!loan) return null;

  return (
    <Modal
      title={
        <Title level={4} style={{ margin: 0 }}>
          {loan.name} - Kredi Detayları
        </Title>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1200}
      destroyOnClose
    >
      <ProvidedBankLoans showAddButton={false} />
      <ExpandedLoanView loanId={loan.id} isActive={visible} />
    </Modal>
  );
};

export default LoanDetailModal;
