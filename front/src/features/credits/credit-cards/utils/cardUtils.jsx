import React from 'react';
import { FaCcMastercard, FaCcVisa } from 'react-icons/fa';
import { BsCreditCardFill } from 'react-icons/bs';

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
};

export const getCardIcon = (type, style) => {
  if (!type) {
    return <BsCreditCardFill style={style} />;
  }
  switch (type.toLowerCase()) {
    case 'mastercard':
      return <FaCcMastercard style={style} />;
    case 'visa':
      return <FaCcVisa style={style} />;
    case 'troy':
      return <BsCreditCardFill style={style} />;
    default:
      return <BsCreditCardFill style={style} />;
  }
};
