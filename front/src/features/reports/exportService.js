// src/features/reports/exportService.js

import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import { message } from 'antd';

export const exportToExcel = (config, mainData, monthlyData, selectedMonth) => {
    if (!mainData || mainData.length === 0) {
        message.warning("Rapor oluşturmak için veri bulunmuyor.");
        return;
    }

    message.info("Excel dosyası oluşturuluyor, lütfen bekleyin...");

    const dataForExcel = [];

    // 1. HESAP BAŞLIKLARI
    const accountHeaders = mainData.map(item => 
        `${item[config.mainData.groupTitle] || ''} - ${item[config.mainData.itemTitle] || ''}`
    );
    dataForExcel.push(["", "", ...accountHeaders]);

    // 2. ÖZET SATIRLARI
    if (config.summaryColumns) {
        config.summaryColumns.forEach(col => {
            const summaryRow = [col.header, ""]; 
            mainData.forEach(account => {
                let value;
                if (col.calculator) {
                    value = col.calculator(account);
                } else {
                    value = parseFloat(account[col.valueKey] || 0);
                }
                summaryRow.push(value);
            });
            dataForExcel.push(summaryRow);
        });
    }
    
    dataForExcel.push([]); 
    dataForExcel.push(["Tarih", "Vakit"]);

    // 5. GÜNLÜK VERİ SATIRLARI
    const balancesByDateAndItem = new Map();
    monthlyData.forEach(b => {
        const dateKey = dayjs(b.entry_date).format('YYYY-MM-DD');
        if (!balancesByDateAndItem.has(dateKey)) {
            balancesByDateAndItem.set(dateKey, new Map());
        }
        balancesByDateAndItem.get(dateKey).set(b[config.monthlyData.itemIdKey], b);
    });

    const daysInMonth = selectedMonth.daysInMonth();
    for (let i = 1; i <= daysInMonth; i++) {
        const currentDate = selectedMonth.date(i);
        const dateKey = currentDate.format('YYYY-MM-DD');
        const dayBalances = balancesByDateAndItem.get(dateKey) || new Map();

        const sabahRow = [currentDate.format('DD.MM.YYYY'), 'Sabah'];
        mainData.forEach(item => {
            const balanceData = dayBalances.get(item[config.mainData.itemIdKey]);
            const value = balanceData ? balanceData[config.monthlyData.morningValueKey] : null;
            sabahRow.push(value !== null ? parseFloat(value) : null);
        });
        dataForExcel.push(sabahRow);

        const aksamRow = ['', 'Akşam'];
        mainData.forEach(item => {
            const balanceData = dayBalances.get(item[config.mainData.itemIdKey]);
            const value = balanceData ? balanceData[config.monthlyData.eveningValueKey] : null;
            aksamRow.push(value !== null ? parseFloat(value) : null);
        });
        dataForExcel.push(aksamRow);
    }

    // 6. EXCEL DOSYASINI OLUŞTURMA
    const ws = XLSX.utils.aoa_to_sheet(dataForExcel);
    const finalColumnWidths = [
        { wch: 18 }, // A sütunu
        { wch: 10 }, // B sütunu
        ...accountHeaders.map(() => ({ wch: 20 }))
    ];
    ws['!cols'] = finalColumnWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, config.title);

    XLSX.writeFile(wb, `${config.title.replace(/ /g, '_')}_${selectedMonth.format('YYYY-MM')}.xlsx`);
    
    message.success("Excel dosyası başarıyla indirildi!");
};