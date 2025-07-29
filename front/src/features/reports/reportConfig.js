// reportConfig.js

import { getAccounts, getDailyBalances } from '../../api/bankStatusService';
import { getKmhAccounts, getDailyRisksForMonth } from '../../api/KMHStatusService';
import { getCreditCards, getDailyLimitsForMonth } from '../../api/creditCardService';
import dayjs from 'dayjs';

// --- CARİ DURUM RAPORU ---
export const accountStatusReportConfig = {
    title: "Cari Durum Raporu",
    api: {
        fetchMainData: getAccounts,
        fetchMonthlyData: getDailyBalances,
    },
    mainData: {
        groupTitle: 'bank_name',
        itemTitle: 'name',
        itemIdKey: 'id' // Ana veri için ID alanı
    },
    monthlyData: {
        itemIdKey: 'account_id',
        morningValueKey: 'morning_balance',
        eveningValueKey: 'evening_balance',
    },
    summaryColumns: [
        { 
            header: 'Varlık',
            calculator: (account) => parseFloat((account.last_evening_balance ?? account.last_morning_balance) || 0)
        }
    ]
};

// --- KMH DURUM RAPORU ---
export const kmhReportConfig = {
    title: "KMH Durum Raporu",
    api: {
        fetchMainData: getKmhAccounts,
        fetchMonthlyData: getDailyRisksForMonth,
    },
    mainData: {
        groupTitle: 'bank_name',
        itemTitle: 'name',
        itemIdKey: 'id' // Ana veri için ID alanı
    },
    monthlyData: {
        itemIdKey: 'kmh_limit_id',
        morningValueKey: 'morning_risk',
        eveningValueKey: 'evening_risk',
    },
    summaryColumns: [
        { header: 'Limit', valueKey: 'kmh_limit' },
        { 
            header: 'Risk', 
            calculator: (account) => parseFloat((account.current_evening_risk ?? account.current_morning_risk) || 0)
        },
        { 
            header: 'Kullanılabilir', 
            calculator: (account) => {
                const latestRisk = parseFloat((account.current_evening_risk ?? account.current_morning_risk) || 0);
                const limit = parseFloat(account.kmh_limit || 0);
                return limit - latestRisk;
            }
        }
    ]
};

// --- KREDİ KARTI RAPORU ---
export const creditCardReportConfig = {
    title: "Kredi Kartı Raporu",
    api: {
        fetchMainData: getCreditCards,
        fetchMonthlyData: getDailyLimitsForMonth,
    },
    mainData: {
        groupTitle: 'bank_name',
        itemTitle: 'name',
        itemIdKey: 'id' // Ana veri için ID alanı
    },
    monthlyData: {
        itemIdKey: 'credit_card_id',
        morningValueKey: 'morning_limit',
        eveningValueKey: 'evening_limit',
    },
    summaryColumns: [
        { header: 'Toplam Limit', valueKey: 'credit_card_limit' },
        { 
            header: 'Kullanılabilir Limit', 
            calculator: (account) => parseFloat((account.current_evening_limit ?? account.current_morning_limit) || 0)
        }
    ]
};