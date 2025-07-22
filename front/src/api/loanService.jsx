import { api } from './api';

// --- Loan Services ---
export const getLoans = () => api.get('/loans');
export const getLoanById = (loanId) => api.get(`/loans/${loanId}`);
export const createLoan = (loanData) => api.post('/loans', loanData);
export const updateLoan = (loanId, loanData) => api.put(`/loans/${loanId}`, loanData);
export const deleteLoan = (loanId) => api.delete(`/loans/${loanId}`);

// --- Loan Type Services ---
export const getLoanTypes = () => api.get('/loan-types');
export const createLoanType = (loanTypeData) => api.post('/loan-types', loanTypeData);
