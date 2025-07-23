import { api } from './api';

// --- Loan Services ---
export const getLoans = () => api.get('/loans');
export const getLoanById = (loanId) => api.get(`/loans/${loanId}`);
export const createLoan = (loanData) => api.post('/loans', loanData);
export const updateLoan = (loanId, loanData) => api.put(`/loans/${loanId}`, loanData);
export const deleteLoan = (loanId) => api.delete(`/loans/${loanId}`);

// --- Loan Type Services ---
export const getLoanTypes = () => api.get('/loan-types');
export const getLoanTypeById = (loanTypeId) => api.get(`/loan-types/${loanTypeId}`);
export const createLoanType = (loanTypeData) => api.post('/loan-types', loanTypeData);
export const updateLoanType = (loanTypeId, loanTypeData) => api.put(`/loan-types/${loanTypeId}`, loanTypeData);
export const deleteLoanType = (loanTypeId) => api.delete(`/loan-types/${loanTypeId}`);

// --- Loan Payment Services ---
export const getPaymentsForLoan = (loanId, page = 1, per_page = 20) => 
    api.get(`/loans/${loanId}/payments`, { params: { page, per_page } });

export const makePayment = async (loanId, paymentData) => {
    const response = await api.post(`/loans/${loanId}/payments`, paymentData);
    return response.data; // Return the data from the response
};

// --- Amortization Schedule ---
export const getAmortizationSchedule = (loanId) => api.get(`/loans/${loanId}/amortization-schedule`);
