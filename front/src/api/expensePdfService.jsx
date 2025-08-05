// src/api/expensePdfService.jsx

import {api} from './api';

/**
 * Belirtilen bir gidere ait tüm PDF dosyalarını getirir.
 * @param {number} expenseId Giderin ID'si
 */
export const getPdfsForExpense = async (expenseId) => {
  // URL'i backend'deki yeni yapıya uygun hale getiriyoruz.
  const response = await api.get(`/expense-pdfs/expense/${expenseId}`);
  return response.data;
};

/**
 * Belirtilen bir gidere yeni bir PDF dosyası yükler.
 * @param {number} expenseId Giderin ID'si
 * @param {File} file Yüklenecek dosya
 */
export const uploadPdfForExpense = async (expenseId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  // URL'i backend'deki yeni yapıya uygun hale getiriyoruz.
  const response = await api.post(`/expense-pdfs/expense/${expenseId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Belirtilen ID'ye sahip bir PDF dosyasını siler.
 * @param {number} pdfId Silinecek dosyanın ID'si
 */
export const deletePdf = async (pdfId) => {
  const response = await api.delete(`/expense-pdfs/${pdfId}`);
  return response.data;
};