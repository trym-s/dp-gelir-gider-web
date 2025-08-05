// src/api/incomePdfService.jsx

import {api} from './api';

/**
 * Belirtilen bir gelire ait tüm PDF dosyalarını getirir.
 * @param {number} incomeId Gelir ID'si
 */
export const getPdfsForIncome = async (incomeId) => {
  const response = await api.get(`/income-pdfs/income/${incomeId}`);
  return response.data;
};

/**
 * Belirtilen bir gelire yeni bir PDF dosyası yükler.
 * @param {number} incomeId Gelir ID'si
 * @param {File} file Yüklenecek dosya
 */
export const uploadPdfForIncome = async (incomeId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post(`/income-pdfs/income/${incomeId}`, formData, {
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
  const response = await api.delete(`/income-pdfs/${pdfId}`);
  return response.data;
};