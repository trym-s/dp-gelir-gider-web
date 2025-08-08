import React from 'react';
import { FaCcMastercard, FaCcVisa } from 'react-icons/fa';
import { BsCreditCardFill } from 'react-icons/bs';

const CardBrandIcon = ({ brand, style }) => {
  // brand veya brand.name yoksa veya boş bir string ise varsayılan ikonu göster.
  if (!brand?.name) {
    return <BsCreditCardFill style={style} />;
  }

  const brandName = brand.name.toLowerCase();
  
  if (brandName.includes('visa')) {
    return <FaCcVisa style={style} />;
  }

  if (brandName.includes('mastercard')) {
    return <FaCcMastercard style={style} />;
  }
  
  // Troy için public klasöründeki resmi kullan
  // Not: Bu yolun projenizin yapısına göre doğru olduğundan emin olun.
  if (brandName.includes('troy')) {
    // stil objesindeki fontSize'ı resmin genişliği olarak kullanmak iyi bir yaklaşım
    return <img src="/bank_logo/troy-logo.png" alt="Troy Logo" style={{ width: style.fontSize, height: 'auto' }} />;
  }

  // Bilinen markalardan hiçbiri değilse varsayılan ikonu göster.
  return <BsCreditCardFill style={style} />;
};

export default CardBrandIcon;
