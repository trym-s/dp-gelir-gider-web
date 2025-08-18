// src/api/reminderService.js

import { api } from './api';

/**
 * Tüm hatırlatmaları (eksik girişler, yaklaşan vadeler) backend'den çeker.
 * @returns {Promise<Array>} - Hatırlatma objelerini içeren bir dizi döner.
 */
export const getReminders = async () => {
  try {
    const response = await api.get('/reminders');
    return response.data; 
  } catch (error) {
    console.error("Hatırlatmalar getirilirken hata oluştu:", error);
    throw error;
  }
};