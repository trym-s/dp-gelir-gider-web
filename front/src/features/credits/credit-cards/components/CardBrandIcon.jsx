import React from 'react';
import { FaCcMastercard, FaCcVisa } from 'react-icons/fa';
import { BsCreditCardFill } from 'react-icons/bs';

const CardBrandIcon = ({ brand, style }) => {
  // Eğer brand nesnesi veya brand.name mevcut değilse, varsayılan ikonu göster.
  if (!brand || !brand.name) {
    return <BsCreditCardFill style={style} />;
  }

  const brandName = brand.name.toLowerCase();
  if (brandName.includes('troy')) {
    return <img src="../../../../public/bank_logo/troy-logo.png" alt="Troy Logo" style={{ width: style.fontSize, height: 'auto' }} />;
  }
  // Marka adına göre doğru ikonu seç.
  if (brandName.includes('visa')) {
    return <FaCcVisa style={style} />;
  }

  if (brandName.includes('mastercard')) {
    return <FaCcMastercard style={style} />;
  }
  
  // Bilinen diğer markalar için de benzer kontroller eklenebilir.
  if (brandName.includes('troy')) {
      return <BsCreditCardFill style={style} />; // Troy için şimdilik varsayılan ikon
  }

  // Hiçbir koşul eşleşmezse varsayılan ikonu göster.
  return <BsCreditCardFill style={style} />;
};

export default CardBrandIcon;