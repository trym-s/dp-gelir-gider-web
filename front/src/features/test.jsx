import React, { useState } from 'react';

// Her bir banka kartı için kullandığımız bileşen
const BankCard = ({ bankData }) => {
  const [isCardHovered, setCardHovered] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);

  // Dinamik renk için yardımcı fonksiyon
  const getLimitBarColor = (usage) => {
    if (usage > 80) return '#f44336';
    if (usage > 60) return '#ff9800';
    return '#2196f3';
  };

  const cardStyle = {
    background: 'white',
    borderRadius: '16px',
    padding: '20px',
    transition: 'all 0.3s ease',
    boxShadow: isCardHovered ? '0 12px 24px rgba(0,0,0,0.12)' : '0 4px 12px rgba(0,0,0,0.05)',
    transform: isCardHovered ? 'translateY(-5px)' : 'translateY(0)',
    marginBottom: '24px'
  };

  const clickableAreaStyle = {
    cursor: 'pointer',
    padding: '8px 12px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    transition: 'background-color 0.2s ease',
  };
  
  // YENİ: Tek satır KPI için stil
  const kpiRowStyle = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '12px',
    fontSize: '12px'
  };

  const kpiLabelStyle = {
    color: '#666',
    flexShrink: 0, // Etiketin küçülmesini engeller
    width: '180px' // Tüm etiketlerin aynı hizada durması için sabit genişlik
  };

  return (
    <div 
      style={cardStyle}
      onMouseEnter={() => setCardHovered(true)}
      onMouseLeave={() => setCardHovered(false)}
    >
      {/* Üst Kısım */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
         <img 
    src={`/bank_logo/Akbank-icon.png`} 
    alt={`${bankData.bankName} Logo`} 
    style={{
        // Yinelenen özelliklerden sadece sonuncuları ve mantıklı olanları aldık
        width: '60px',
        height: '60px',
        backgroundColor: '#fbfcfdff', // background-color -> backgroundColor
        borderRadius: '12px',      // border-radius -> borderRadius
        marginRight: '12px',       // İki tane vardı, birini tuttuk
        padding: 5                 // '5px' yerine 5 yazdık ve virgül ekledik
    }}
/>
        <span style={{ fontWeight: 600 }}>{bankData.bankName}</span>
      </div>

      {/* Orta Kısım - YENİ TEK SATIRLIK PROGRESS BARLAR */}
      <div style={{ flexGrow: 1, padding: '10px 0' }}>
        
        {/* KPI 1: Kredi Limiti */}
        <div style={kpiRowStyle}>
          <span style={kpiLabelStyle}>Kredi Limiti Kullanımı:</span>
          <div style={{ background: '#e0e0e0', borderRadius: '4px', height: '8px', flexGrow: 1 }}>
            <div style={{ width: `${bankData.limitUsage}%`, background: getLimitBarColor(bankData.limitUsage), height: '8px', borderRadius: '4px' }}></div>
          </div>
        </div>

        {/* KPI 2: Nakit Akışı */}
        <div style={kpiRowStyle}>
          <span style={kpiLabelStyle}>Aylık Nakit Akışı:</span>
          <div style={{ background: '#e0e0e0', borderRadius: '4px', height: '8px', flexGrow: 1, display: 'flex' }}>
            <div style={{ width: `${bankData.cashFlow.inflowPercent}%`, background: '#4caf50' }} title={`Giren: ₺${bankData.cashFlow.inflowAmount}`}></div>
            <div style={{ width: `${bankData.cashFlow.outflowPercent}%`, background: '#f44336' }} title={`Çıkan: ₺${bankData.cashFlow.outflowAmount}`}></div>
          </div>
        </div>

        {/* KPI 3: Kredi Ödeme */}
        <div style={{...kpiRowStyle, marginBottom: 0}}>
          <span style={kpiLabelStyle}>Kredi Geri Ödemesi:</span>
          <div style={{ background: '#e0e0e0', borderRadius: '4px', height: '8px', flexGrow: 1 }}>
            <div style={{ width: `${bankData.loanProgress}%`, background: '#9c27b0', height: '8px', borderRadius: '4px' }}></div>
          </div>
        </div>
      </div>

      {/* Alt Kısım - Tıklanabilir İkonlar (Değişiklik yok) */}
      <div style={{ display: 'flex', justifyContent: 'space-around', borderTop: '1px solid #eee', paddingTop: '16px', fontSize: '14px', alignItems: 'center' }}>
        {/* ... önceki versiyondaki tıklanabilir butonlar burada ... */}
        <div 
          onClick={() => setExpandedSection(expandedSection === 'cards' ? null : 'cards')} 
          style={{...clickableAreaStyle, background: expandedSection === 'cards' ? '#e3f2fd' : 'transparent'}}
        >
          💳 {bankData.cardsCount} Kart 
          <span style={{ marginLeft: '8px', fontSize: '10px', transform: expandedSection === 'cards' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>▼</span>
        </div>
        <div 
          onClick={() => setExpandedSection(expandedSection === 'accounts' ? null : 'accounts')}
          style={{...clickableAreaStyle, background: expandedSection === 'accounts' ? '#e3f2fd' : 'transparent'}}
        >
          🏦 {bankData.accountsCount} Hesap
          <span style={{ marginLeft: '8px', fontSize: '10px', transform: expandedSection === 'accounts' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>▼</span>
        </div>
        <div style={{ padding: '8px' }}>💰 {bankData.totalBalance}</div>
      </div>

      {/* Genişleyen Alanlar (Değişiklik yok) */}
      {expandedSection && (
        <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
          {/* ... önceki versiyondaki açılır çekmece içeriği burada ... */}
          <h5 style={{ margin: '0 0 12px 0', color: '#333' }}>
            {expandedSection === 'accounts' ? 'Hesap Detayları' : 'Kredi Kartı Detayları'}
          </h5>
          <div style={{padding: '8px', background: '#fafafa', borderRadius: '6px'}}>Örnek İçerik</div>
        </div>
      )}
    </div>
  );
};


// Ana Dashboard Bileşeni (Değişiklik yok)
function Dashboard() {
  const bankData = [
    { id: 1, bankName: 'Garanti BBVA', logoText: 'G', cardsCount: 3, accountsCount: 2, totalBalance: '₺85.2K', limitUsage: 45, cashFlow: {inflowPercent:60, outflowPercent:40, inflowAmount: '12.000', outflowAmount: '8.000'}, loanProgress: 75 },
    { id: 2, bankName: 'Garanti BBVA', logoText: 'G', cardsCount: 3, accountsCount: 2, totalBalance: '₺85.2K', limitUsage: 45, cashFlow: {inflowPercent:60, outflowPercent:40, inflowAmount: '12.000', outflowAmount: '8.000'}, loanProgress: 75 },
    { id: 3, bankName: 'Garanti BBVA', logoText: 'G', cardsCount: 3, accountsCount: 2, totalBalance: '₺85.2K', limitUsage: 45, cashFlow: {inflowPercent:60, outflowPercent:40, inflowAmount: '12.000', outflowAmount: '8.000'}, loanProgress: 75 },
    { id: 4, bankName: 'Garanti BBVA', logoText: 'G', cardsCount: 3, accountsCount: 2, totalBalance: '₺85.2K', limitUsage: 45, cashFlow: {inflowPercent:60, outflowPercent:40, inflowAmount: '12.000', outflowAmount: '8.000'}, loanProgress: 75 },
    { id: 5, bankName: 'Akbank', logoText: 'A', cardsCount: 5, accountsCount: 4, totalBalance: '₺210.7K', limitUsage: 82, cashFlow: {inflowPercent:30, outflowPercent:70, inflowAmount: '5.000', outflowAmount: '11.500'}, loanProgress: 0 },
    // ... diğer bankalar
  ];

  const columns = [[], [], []];
  bankData.forEach((data, index) => {
    columns[index % 3].push(data);
  });

  return (
    <div style={{ display: 'flex', padding: '24px', backgroundColor: '#f0f2f5', fontFamily: 'sans-serif', alignItems: 'flex-start' }}>
      {columns.map((columnData, columnIndex) => (
        <div key={columnIndex} style={{ flex: 1, marginRight: columnIndex < 2 ? '24px' : '0' }}>
          {columnData.map(data => (
            <BankCard key={data.id} bankData={data} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default Dashboard;