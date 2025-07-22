import { api } from './api';

export const getBanks = async () => {
  try {
    const response = await api.get('/banks');
    return response.data;
  } catch (error) {
    console.error('Error fetching banks:', error);
    throw error;
  }
};

export const getBankLogsByDate = async (date) => {
  try {
    const response = await api.get('/bank-logs', { params: { date } });
    return response.data;
  } catch (error) {
    console.error('Error fetching bank logs:', error);
    throw error;
  }
};

export const saveBankLogs = async (logs) => {
  try {
    const response = await api.post('/bank-logs/bulk-upsert', logs);
    return response.data;
  } catch (error) {
    console.error('Error saving bank logs:', error);
    throw error;
  }
};

export const createBank = async (bankData) => {
  try {
    const response = await api.post('/banks', bankData);
    return response.data;
  } catch (error) {
    console.error('Error creating bank:', error);
    throw error;
  }
};

export const deleteBank = async (bankId) => {
  try {
    const response = await api.delete(`/banks/${bankId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting bank:', error);
    throw error;
  }
};
