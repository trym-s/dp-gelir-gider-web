import React from 'react';
import { Result } from 'antd';

const ResultStep = ({ result }) => {
  if (!result) return null;

  if (result.status === 'success') {
    return (
      <Result
        status="success"
        title="İşlem Başarıyla Tamamlandı!"
        subTitle={`${result.count} adet yeni harcama kartınıza eklendi.`}
      />
    );
  }

  return (
    <Result
      status="error"
      title="İçe Aktarma Başarısız Oldu"
      subTitle="Lütfen dosyanızı kontrol edin veya daha sonra tekrar deneyin."
      extra={<p>{result.message}</p>}
    />
  );
};

export default ResultStep;