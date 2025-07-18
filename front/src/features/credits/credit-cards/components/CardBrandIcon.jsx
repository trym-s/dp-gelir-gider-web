import React from 'react';
import * as FaIcons from 'react-icons/fa';
import * as BsIcons from 'react-icons/bs';

// Desteklenen ikon setleri
const iconLibraries = {
  fa: FaIcons,
  bs: BsIcons,
};

const CardBrandIcon = ({ brand, style }) => {
  // Eğer brand verisi yoksa veya boşsa, varsayılan ikonu göster
  if (!brand || (!brand.icon_component_name && !brand.logo_url)) {
    return <BsIcons.BsCreditCardFill style={style} />;
  }

  // Eğer logo URL'si varsa, bir resim göster
  if (brand.logo_url) {
    return <img src={brand.logo_url} alt={brand.name} style={{ width: style.fontSize, height: 'auto' }} />;
  }

  // Eğer ikon bileşen adı varsa, dinamik olarak ikonu render et
  if (brand.icon_component_name) {
    const libPrefix = brand.icon_component_name.substring(0, 2).toLowerCase();
    const IconComponent = iconLibraries[libPrefix]?.[brand.icon_component_name];

    if (IconComponent) {
      return <IconComponent style={style} />;
    }
  }

  // Hiçbir şey eşleşmezse varsayılan ikonu göster
  return <BsIcons.BsCreditCardFill style={style} />;
};

export default CardBrandIcon;
