import { api } from '../../../api/api';
import { createCrudService } from '../../../api/serviceFactory';

/**
 * Creates a generic service for a given entity type ('income' or 'expense').
 * @param {string} entityType - The type of the entity ('income' or 'expense').
 * @returns {object} A full service object for the entity.
 */
export const createTransactionService = (entityType) => {
  const endpoint = `${entityType}s`; // 'incomes' or 'expenses'
  const crudService = createCrudService(endpoint);

  const entitySpecifics = {
    income: {
      groupEndpoint: 'income-groups',
      addTransactionEndpoint: (id, data) => api.post(`/incomes/${id}/receipts`, data),
    },
    expense: {
      groupEndpoint: 'expense-groups',
      addTransactionEndpoint: (id, data) => api.post(`/expenses/${id}/payments`, data),
    },
  };

  const specifics = entitySpecifics[entityType];

  if (!specifics) {
    throw new Error(`Invalid entityType: ${entityType}`);
  }

  /**
   * Fetches pivot data for the entity.
   * @param {string} month - The month in 'YYYY-MM' format.
   * @param {object} options - Additional options like AbortSignal.
   * @returns {Promise<object>} The pivot data.
   */
  const getPivot = async (month, options = {}) => {
    try {
      const response = await api.get(`/${endpoint}/pivot`, {
        params: { month },
        ...options,
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${entityType} pivot data:`, error);
      throw error;
    }
  };

  /**
   * Creates a new group for the entity.
   * @param {object} groupData - The data for the new group.
   * @returns {Promise<object>} The created group data.
   */
  const createGroup = async (groupData) => {
    try {
      const response = await api.post(`/${specifics.groupEndpoint}`, groupData);
      return response.data;
    } catch (error) {
      console.error(`Error creating ${entityType} group:`, error);
      throw error;
    }
  };
  
  /**
   * Fetches all groups for the entity.
   * @returns {Promise<Array>} A list of groups.
   */
  const getGroups = async () => {
    try {
      const response = await api.get(`/${specifics.groupEndpoint}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${entityType} groups:`, error);
      throw error;
    }
  };

  /**
   * Adds a related transaction (payment or receipt).
   * @param {number} entityId - The ID of the main entity.
   * @param {object} transactionData - The data for the payment/receipt.
   * @returns {Promise<object>} The response data.
   */
  const addRelatedTransaction = async (entityId, transactionData) => {
    try {
      const response = await specifics.addTransactionEndpoint(entityId, transactionData);
      return response.data;
    } catch (error) {
      console.error(`Error adding transaction to ${entityType} ${entityId}:`, error);
      throw error;
    }
  };


  return {
    ...crudService,
    getPivot,
    createGroup,
    getGroups,
    addRelatedTransaction,
  };
};

export const incomeService = createTransactionService('income');
export const expenseService = createTransactionService('expense');
