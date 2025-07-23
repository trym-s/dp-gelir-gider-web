import React from 'react';
import './LoanKPIs.css';

const LoanKPIs = () => {
  // Placeholder data - bu veriler daha sonra API'den veya hesaplamalardan gelecek
  const kpiData = {
    adoptionRate: 45, // %
    debtReductionRate: 15, // %
    dataCompleteness: 85, // %
  };

  return (
    <div className="loan-kpi-container">
      <h3 className="kpi-title">Kredi Performans Göstergeleri (KPI)</h3>
      <div className="kpi-cards">
        <div className="kpi-card">
          <h4>Kredi Benimseme Oranı</h4>
          <p className="kpi-value">{kpiData.adoptionRate}%</p>
          <p className="kpi-description">Aktif kullanıcıların bu özelliği kullanma oranı.</p>
        </div>
        <div className="kpi-card">
          <h4>Toplam Borç Azalması</h4>
          <p className="kpi-value">{kpiData.debtReductionRate}%</p>
          <p className="kpi-description">Son 3 aydaki toplam borç azalma oranı.</p>
        </div>
        <div className="kpi-card">
          <h4>Veri Bütünlüğü</h4>
          <p className="kpi-value">{kpiData.dataCompleteness}%</p>
          <p className="kpi-description">Kritik kredi bilgilerinin doluluk oranı.</p>
        </div>
      </div>
    </div>
  );
};

export default LoanKPIs;
