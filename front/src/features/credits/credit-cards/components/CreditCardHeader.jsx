import React from 'react';
import CardBrandIcon from './CardBrandIcon';

const CreditCardHeader = ({ bankName, brand }) => (
  <div className="card-header">
    <h3 className="bank-name">{bankName}</h3>
    <CardBrandIcon brand={brand} style={{ fontSize: '2.5rem', color: '#5a7184' }} />
  </div>
);

export default CreditCardHeader;
