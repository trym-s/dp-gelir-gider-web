// JSX YOK — .js dosyasında güvenli
import React from 'react';
import RequiredLabel from './RequiredLabel';

export const req = (labelText, help) => {
  return {
    label: React.createElement(RequiredLabel, { help }, labelText),
    rules: [
      { required: true, message: `Lütfen ${String(labelText || '').toLowerCase()} girin.` }
    ],
  };
};
