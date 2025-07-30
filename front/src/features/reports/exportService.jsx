// src/features/reports/exportService.js

import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import { message } from 'antd';

// Bu fonksiyon, hangi sayfadan çağrılırsa çağrılsın,
// kendisine verilen konfigürasyon ve verilere göre Excel oluşturur.
export const exportToExcel = (config, mainData, monthlyData, selectedMonth) => {
    // Verilerin yüklenip yüklenmediğini kontrol et
    if (!mainData || mainData.length === 0) {
        message.warning("Rapor için dışa aktarılacak veri bulunmuyor.");
        return;
    }

    message.info("Excel dosyası oluşturuluyor, lütfen bekleyin...");

    // BAŞLIK SATIRI (Sütunlar: Tarih, Vakit, Hesap1, Hesap2...)
    const header = [
        "Tarih", 
        "Vakit", 
        ...mainData.map(item => `${item[config.mainData.groupTitle]} - ${item[config.mainData.itemTitle]}`)
    ];

    const dataForExcel = [header];

    // VERİLERİ MAP YAPISINA ÇEVİRME
    const balancesByDateAndItem = new Map();
    monthlyData.forEach(b => {
        const dateKey = dayjs(b.entry_date).format('YYYY-MM-DD');
        if (!balancesByDateAndItem.has(dateKey)) {
            balancesByDateAndItem.set(dateKey, new Map());
        }
        balancesByDateAndItem.get(dateKey).set(b[config.monthlyData.itemIdKey], b);
    });

    // SATIRLARI OLUŞTURMA (Günler satırlarda, Hesaplar sütunlarda)
    const daysInMonth = selectedMonth.daysInMonth();
    for (let i = 1; i <= daysInMonth; i++) {
        const currentDate = selectedMonth.date(i);
        const dateKey = currentDate.format('YYYY-MM-DD');
        const dayBalances = balancesByDateAndItem.get(dateKey) || new Map();
        
        const sabahRow = [
            currentDate.format('DD.MM.YYYY'), 
            'Sabah',
            ...mainData.map(item => {
                const balanceData = dayBalances.get(item.id);
                const value = balanceData ? balanceData[config.monthlyData.morningValueKey] : null;
                return value !== null ? parseFloat(value) : null;
            })
        ];

        const aksamRow = [
            '', 
            'Akşam',
            ...mainData.map(item => {
                const balanceData = dayBalances.get(item.id);
                const value = balanceData ? balanceData[config.monthlyData.eveningValueKey] : null;
                return value !== null ? parseFloat(value) : null;
            })
        ];
        dataForExcel.push(sabahRow, aksamRow);
    }

    // EXCEL DOSYASINI OLUŞTURMA VE İNDİRME
    const ws = XLSX.utils.aoa_to_sheet(dataForExcel);
    const columnWidths = [
        { wch: 12 }, { wch: 8 },
        ...mainData.map(() => ({ wch: 25 }))
    ];
    ws['!cols'] = columnWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, config.title);

    XLSX.writeFile(wb, `${config.title.replace(/ /g, '_')}_${selectedMonth.format('YYYY-MM')}.xlsx`);
    
    message.success("Excel dosyası başarıyla indirildi!");
};