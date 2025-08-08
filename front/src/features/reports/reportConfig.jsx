// reportConfig.js
<<<<<<< HEAD

=======
>>>>>>> origin/merged2.0
import { getBankAccountsWithStatus, getDailyBalances } from '../../api/bankAccountService';
import { getKmhAccounts, getDailyRisksForMonth } from '../../api/KMHStatusService';
import { getCreditCards, getDailyLimitsForMonth } from '../../api/creditCardService';
import dayjs from 'dayjs';

// --- CARİ DURUM RAPORU ---
export const accountStatusReportConfig = {
    title: "Cari Durum Raporu",
    api: {
        fetchMainData: getBankAccountsWithStatus,
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
            calculator: (account) => account.calculated_asset 
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
            // DÜZELTME: Hesaplayıcı artık önceden hesaplanmış 'calculated_risk' alanını kullanıyor.
            calculator: (account) => account.calculated_risk
        },
        { 
            header: 'Kullanılabilir', 
            // DÜZELTME: "Kullanılabilir" de artık doğru risk değerini kullanıyor.
            calculator: (account) => {
                const latestRisk = account.calculated_risk; // Doğru risk değeri
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
        { 
            header: 'Toplam Limit', 
            // DÜZELTME: Artık önceden hazırlanmış 'limit' alanını kullanıyor.
            valueKey: 'limit'
        },
        { 
            header: 'Kullanılabilir Limit', 
            // DÜZELTME: Hesaplayıcı, önceden hesaplanmış 'calculated_available_limit' alanını kullanıyor.
            calculator: (card) => card.calculated_available_limit
        }
    ]
};
