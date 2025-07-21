// /front/src/features/credits/bank-logs/api.jsx

// --- Mock Database ---
// Simulates a real database with banks and their daily balance logs.
const mockDatabase = {
  banks: [
    { id: 1, name: 'Ziraat Bankası', logo: '/Ziraat-Bankasi-Simbolo.png' },
    { id: 2, name: 'VakıfBank', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Vakifbank.svg/1280px-Vakifbank.svg.png' },
    { id: 3, name: 'QNB Finansbank', logo: null },
    { id: 4, name: 'İş Bankası', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/İş_Bankası_logo.svg/1280px-İş_Bankası_logo.svg.png' },
    { id: 5, name: 'Garanti BBVA', logo: null },
    { id: 6, name: 'Akbank', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Akbank_logo.svg/1280px-Akbank_logo.svg.png' },
    { id: 7, name: 'Yapı Kredi', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Yapı_Kredi_logo.svg/1280px-Yapı_Kredi_logo.svg.png' },
  ],
  balanceLogs: [
    { id: 101, bankId: 1, period: 'morning', date: '2025-07-21', try: 70445.16, usd: 0, eur: 0, kur_usd_try: 35.00, kur_eur_try: 38.00 },
    { id: 102, bankId: 2, period: 'morning', date: '2025-07-21', try: 11140.39, usd: 0, eur: 0, kur_usd_try: 35.00, kur_eur_try: 38.00 },
  ],
};

// --- Mock API Functions ---
export const api = {
  fetchBalances: async (date, period) => {
    console.log(`API CALL: Fetching balances for ${date} [${period}]`);
    await new Promise(resolve => setTimeout(resolve, 500));

    const allBanks = mockDatabase.banks;
    const logsForPeriod = mockDatabase.balanceLogs.filter(
      log => log.date === date && log.period === period
    );

    const results = allBanks.map(bank => {
      const bankLog = logsForPeriod.find(log => log.bankId === bank.id);
      if (bankLog) {
        return { ...bank, ...bankLog };
      } else {
        return {
          ...bank,
          id: `new-${bank.id}-${date}-${period}`,
          date,
          period,
          try: 0,
          usd: 0,
          eur: 0,
          kur_usd_try: null,
          kur_eur_try: null,
        };
      }
    });
    return results;
  },

  updateBalance: async ({ balanceId, try: newTry, usd: newUsd, eur: newEur }) => {
    console.log(`API CALL: Updating balance ${balanceId}`);
    await new Promise(resolve => setTimeout(resolve, 400));

    let balance = mockDatabase.balanceLogs.find(b => b.id === balanceId);
    if (balance) {
      balance.try = newTry;
      balance.usd = newUsd;
      balance.eur = newEur;
    } else {
      const [, bankId, date, period] = balanceId.toString().split('-');
      const newLog = {
        id: Math.floor(Math.random() * 10000),
        bankId: parseInt(bankId, 10),
        date,
        period,
        try: newTry,
        usd: newUsd,
        eur: newEur,
        kur_usd_try: 35.12, // Mock current rate
        kur_eur_try: 38.45, // Mock current rate
      };
      mockDatabase.balanceLogs.push(newLog);
      balance = newLog;
    }
    return balance;
  },

  addBank: async (bankName) => {
    console.log(`API CALL: Adding new bank -> ${bankName}`);
    await new Promise(resolve => setTimeout(resolve, 400));

    const newBank = {
      id: Math.max(...mockDatabase.banks.map(b => b.id)) + 1,
      name: bankName,
      logo: null,
    };
    mockDatabase.banks.push(newBank);
    return newBank;
  },
};
