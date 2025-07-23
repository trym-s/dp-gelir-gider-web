// src/api/loanService.js
import { api } from './api';

// Tüm kredileri getir
export const getAllLoans = async () => {
  try {
    const response = await api.get('/loan/list');
    return response.data;
  } catch (error) {
    console.error("Krediler getirilirken hata oluştu:", error);
    throw error;
  }
};

// Kredi ekle veya güncelle
export const addOrUpdateLoan = async (loanData) => {
  try {
    const response = await api.post('/loan/add', loanData); 
    return response.data;
  } catch (error) {
    console.error("Kredi eklenirken/güncellenirken hata oluştu:", error);
    throw error;
  }
};

// Kredi sil
export const deleteLoan = async (loanId) => {
  try {
    const response = await api.delete(`/loan/${loanId}`);
    return response.data;
  } catch (error) {
    console.error("Kredi silinirken hata oluştu:", error);
    throw error;
  }
};

export const getLoanTypes = async () => {
  try {
    const response = await api.get('/loan/types');
    return response.data;
  } catch (error) {
    console.error("Kredi türleri getirilirken hata:", error);
    throw error;
  }
};

//kredi türü ekleme
export const addLoanType = async (data) => {
  const response = await api.post('/loan/types/add', data);
  return response.data;
};