
import { api } from './api';

/** Accepts either an array or { data: [...] } and returns the array. */
const toArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
};

/** Compact params: drop undefined/null/empty-string */
const compactParams = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ''));

/** Normalize currency to upper and validate against allowed set. Invalids are ignored (warned). */
const normalizeCurrency = (c) => {
  if (!c) return undefined;
  const v = String(c).trim().toUpperCase();
  const allowed = new Set(['TRY', 'USD', 'EUR', 'GBP', 'AED']);
  if (!allowed.has(v)) {
    console.warn('[summaryService] Ignoring invalid currency param:', c);
    return undefined;
  }
  return v;
};

/** Merge params with normalized currency if valid. */
const withCurrency = (params, currency) => {
  const c = normalizeCurrency(currency);
  return c ? { ...params, currency: c } : params;
};

/* ========================================================================== */
/* ========================= Reports (object returns) ======================== */
/* ========================================================================== */

/**
 * Expense report
 * @param {string} startDate YYYY-MM-DD
 * @param {string} endDate   YYYY-MM-DD
 * @param {object} options   { groupBy?, groupName?, currency?, signal? }
 */
export const getExpenseReport = async (startDate, endDate, options = {}) => {
  try {
    const params = withCurrency(
      compactParams({
        start_date: startDate,
        end_date: endDate,
        group_by: options.groupBy,
        group_name: options.groupName,
      }),
      options.currency
    );
    const response = await api.get('/expense_report', { params, signal: options.signal });
    // { timeframe, summary, details }
    return response.data;
  } catch (error) {
    console.error('Error while fetching expense report:', error);
    throw error;
  }
};

/**
 * Income report
 * @param {string} startDate YYYY-MM-DD
 * @param {string} endDate   YYYY-MM-DD
 * @param {object} options   { groupBy?, groupName?, currency?, signal? }
 */
export const getIncomeReport = async (startDate, endDate, options = {}) => {
  try {
    const params = withCurrency(
      compactParams({
        start_date: startDate,
        end_date: endDate,
        group_by: options.groupBy,
        group_name: options.groupName,
      }),
      options.currency
    );
    const response = await api.get('/income_report', { params, signal: options.signal });
    // { timeframe, summary, details }
    return response.data;
  } catch (error) {
    console.error('Error while fetching income report:', error);
    throw error;
  }
};

/**
 * Summary totals (adding since currency is supported on backend)
 * @param {string} startDate YYYY-MM-DD
 * @param {string} endDate   YYYY-MM-DD
 * @param {object} options   { currency?, signal? }
 */
export const getSummaryData = async (startDate, endDate, options = {}) => {
  const params = withCurrency(
    compactParams({ start_date: startDate, end_date: endDate }),
    options.currency
  );
  const response = await api.get('/summary', { params, signal: options.signal });
  // { timeframe, totals: {...} }
  return response.data;
};

/* ========================================================================== */
/* ================= Graphs & Distributions (array returns) ================= */
/* ========================================================================== */

/**
 * Expense graph
 * @param {string} startDate
 * @param {string} endDate
 * @param {object} options { currency?, signal? }
 */
export const getExpenseGraphData = async (startDate, endDate, options = {}) => {
  const params = withCurrency(
    compactParams({ start_date: startDate, end_date: endDate }),
    options.currency
  );
  const response = await api.get('/expense_graph', { params, signal: options.signal });
  return toArray(response.data); // [{ date, paid, remaining }, ...]
};

/**
 * Expense distribution
 * @param {string} startDate
 * @param {string} endDate
 * @param {string} groupBy    'budget_item' | 'region' | 'account_name'
 * @param {object} options    { currency?, signal? }
 */
export const getExpenseDistributionData = async (startDate, endDate, groupBy, options = {}) => {
  const params = withCurrency(
    compactParams({ start_date: startDate, end_date: endDate, by: groupBy, group_by: groupBy }), // backend supports `by`; keeping group_by for backward compat if you used it
    options.currency
  );
  const response = await api.get('/expense_distribution', { params, signal: options.signal });
  return toArray(response.data); // [{ name, paid, remaining }, ...]
};

/**
 * Income graph
 * @param {string} startDate
 * @param {string} endDate
 * @param {object} options { currency?, signal? }
 */
export const getIncomeGraphData = async (startDate, endDate, options = {}) => {
  const params = withCurrency(
    compactParams({ start_date: startDate, end_date: endDate }),
    options.currency
  );
  const response = await api.get('/income_graph', { params, signal: options.signal });
  return toArray(response.data); // [{ date, received, remaining }, ...]
};

/**
 * Income distribution
 * @param {string} startDate
 * @param {string} endDate
 * @param {string} groupBy     'customer' | 'region' | 'account_name' | 'budget_item'
 * @param {object} options     { currency?, signal? }
 */
export const getIncomeDistributionData = async (startDate, endDate, groupBy, options = {}) => {
  const params = withCurrency(
    compactParams({ start_date: startDate, end_date: endDate, by: groupBy, group_by: groupBy }),
    options.currency
  );
  const response = await api.get('/income_distribution', { params, signal: options.signal });
  return toArray(response.data); // [{ name, received, remaining }, ...]
};

/**
 * Combined income vs expense graph
 * @param {string} startDate
 * @param {string} endDate
 * @param {object} options { currency?, signal? }
 */
export const getCombinedIncomeExpenseData = async (startDate, endDate, options = {}) => {
  const params = withCurrency(
    compactParams({ start_date: startDate, end_date: endDate }),
    options.currency
  );
  const response = await api.get('/combined_income_expense_graph', { params, signal: options.signal });
  return toArray(response.data); // [{ date, income, expense, difference }, ...]
};

/* ========================================================================== */
/* ================================= Other ================================== */
/* ========================================================================== */

export const getDailyCreditLimitChartData = async (bankId) => {
  try {
    const response = await api.get(`/dashboard/charts/daily-credit-limit/${bankId}`);
    // If backend also returns {data:[...]}, switch to: return toArray(response.data);
    return response.data;
  } catch (error) {
    console.error('Error while fetching daily credit limit chart data:', error);
    throw error;
  }
};

