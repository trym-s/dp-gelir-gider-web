// reportConfig.js

import { getDailyBalances, getBankAccounts } from '../../api/bankAccountService';
// YENİ: KMH servis fonksiyonlarını import et
import { getKmhAccounts, getDailyRisksForMonth } from '../../api/KMHStatusService';
import { getCreditCards, getDailyLimitsForMonth } from '../../api/creditCardService';
import dayjs from 'dayjs';

// CARİ DURUM RAPORU İÇİN KONFİGÜRASYON OBJESİ (Mevcut)
export const accountStatusReportConfig = {
    title: "Cari Durum Raporu",
    api: {
        fetchMainData: getBankAccounts,
        fetchMonthlyData: getDailyBalances,
    },
    mainData: {
        groupTitle: 'bank_name',
        itemTitle: 'name',
    },
    monthlyData: {
        itemIdKey: 'account_id',
        morningValueKey: 'morning_balance',
        eveningValueKey: 'evening_balance',
    }
};

// YENİ: KMH DURUM RAPORU İÇİN KONFİGÜRASYON OBJESİ
export const kmhReportConfig = {
    title: "KMH Durum Raporu",
    api: {
        fetchMainData: getKmhAccounts,
        fetchMonthlyData: getDailyRisksForMonth,
    },
    // Ana veri (kmhAccounts) içindeki alan adları
    mainData: {
        groupTitle: 'bank_name', 
        itemTitle: 'name',      
    },
    // Aylık veri (monthlyRisks) içindeki alan adları
    monthlyData: {
        itemIdKey: 'kmh_limit_id',      // Eşleştirme için kullanılacak ID
        morningValueKey: 'morning_risk', // Sabah değeri
        eveningValueKey: 'evening_risk', // Akşam değeri
    },
    // YENİ: Excel'e özel ek sütunlar (opsiyonel)
    extraColumns: [
        { header: 'Limit', valueKey: 'kmh_limit' }
    ]
};

export const creditCardReportConfig = {
    title: "Kredi Kartı Raporu",
    api: {
        fetchMainData: getCreditCards,
        fetchMonthlyData: getDailyLimitsForMonth,
    },
    // Ana veri (creditCards) içindeki alan adları
    mainData: {
        groupTitle: 'bank_name', 
        itemTitle: 'name',      
    },
    // Aylık veri (monthlyLimits) içindeki alan adları
    monthlyData: {
        itemIdKey: 'credit_card_id',      // Eşleştirme için kullanılacak ID
        morningValueKey: 'morning_limit', // Sabah değeri
        eveningValueKey: 'evening_limit', // Akşam değeri
    },
    // Excel'e özel ek sütunlar
    extraColumns: [
        { header: 'Kart Limiti', valueKey: 'credit_card_limit' }
    ]
};