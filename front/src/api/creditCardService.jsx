import { api } from './api';

// --- Card Brand Services ---
export const getCardBrands = () => api.get('/card-brands');
export const createCardBrand = (brandData) => api.post('/card-brands', brandData);

// --- Bank Account Services ---
export const getBankAccounts = () => api.get('/bank-accounts');
export const createBankAccount = (accountData) => api.post('/bank-accounts', accountData);

// --- Credit Card Services ---
export const getCreditCards = () => api.get('/credit-cards');
export const getCreditCardById = (cardId) => api.get(`/credit-cards/${cardId}`);
export const createCreditCard = (cardData) => api.post('/credit-cards', cardData);
export const updateCreditCard = (cardId, cardData) => api.put(`/credit-cards/${cardId}`, cardData);

// --- Transaction Services ---
export const getTransactionsForCard = (cardId) => api.get(`/credit-cards/${cardId}/transactions`);
export const addTransactionToCard = (cardId, transactionData) => api.post(`/credit-cards/${cardId}/transactions`, transactionData);
