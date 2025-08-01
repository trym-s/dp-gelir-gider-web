import React from 'react';
import { Modal } from 'antd';
import CreditCard from './CreditCard';

const CreditCardDetailModal = ({ card, visible, onClose }) => {
  if (!card) return null;

  return (
    <Modal
      title="Kredi Kartı Detayları"
      open={visible}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      <CreditCard card={card} isInteractive={false} />
    </Modal>
  );
};

export default CreditCardDetailModal;