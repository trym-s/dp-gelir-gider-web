// utils/regionLocaleMap.js
import trTR from 'antd/es/locale/tr_TR';
import enGB from 'antd/es/locale/en_GB';
import enUS from 'antd/es/locale/en_US';

export function getLocaleConfig(regionCode) {
  const map = {
    1: { // Türkiye
      locale: 'tr-TR',
      dayjsLocale: 'tr',
      antdLocale: trTR,
      dateFormat: 'DD.MM.YYYY',
    },
    2: { // İngiltere
      locale: 'en-GB',
      dayjsLocale: 'en',
      antdLocale: enGB,
      dateFormat: 'DD/MM/YYYY',
    },
    3: { // Dubai (İngilizce)
      locale: 'en-AE',
      dayjsLocale: 'en',
      antdLocale: enUS,
      dateFormat: 'DD/MM/YYYY',
    },
    4: { // Amerika
      locale: 'en-US',
      dayjsLocale: 'en',
      antdLocale: enUS,
      dateFormat: 'MM/DD/YYYY',
    },
  };

  return map[regionCode] || map[1]; // varsayılan: Türkiye
}
