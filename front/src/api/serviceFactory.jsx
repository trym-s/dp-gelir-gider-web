import { api } from './api';

/**
 * Creates a standard set of CRUD (Create, Read, Update, Delete) functions for a given API endpoint.
 * @param {string} endpoint - The base name of the API endpoint (e.g., 'companies').
 * @returns {object} An object containing getAll, getById, create, update, and remove functions.
 */
export const createCrudService = (endpoint) => {
  const url = `/${endpoint}`;

  const handleResponse = (response) => response.data;

  const handleError = (error, context) => {
    console.error(`Error in ${context}:`, error.response?.data || error.message);
    throw error;
  };

  return {
    getAll: async () => {
      try {
        const response = await api.get(url);
        return handleResponse(response);
      } catch (error) {
        handleError(error, `getAll ${endpoint}`);
        return []; // Hata durumunda boş dizi döndürerek UI'ın çökmesini engelle
      }
    },

    getById: async (id) => {
      try {
        const response = await api.get(`${url}/${id}`);
        return handleResponse(response);
      } catch (error) {
        return handleError(error, `getById ${endpoint}`);
      }
    },

    create: async (data) => {
      console.log(`--- CREATE ${endpoint.toUpperCase()} (FRONTEND) ---`, data);
      try {
        const response = await api.post(url, data);
        return handleResponse(response);
      } catch (error) {
        return handleError(error, `create ${endpoint}`);
      }
    },

    update: async (id, data) => {
      console.log(`--- UPDATE ${endpoint.toUpperCase()} (FRONTEND) ID: ${id} ---`, data);
      try {
        const response = await api.put(`${url}/${id}`, data);
        return handleResponse(response);
      } catch (error) {
        return handleError(error, `update ${endpoint}`);
      }
    },

    remove: async (id) => {
      try {
        const response = await api.delete(`${url}/${id}`);
        return handleResponse(response);
      } catch (error) {
        return handleError(error, `remove ${endpoint}`);
      }
    },
  };
};
