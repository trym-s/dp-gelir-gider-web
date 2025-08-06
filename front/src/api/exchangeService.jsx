import { api } from './api';

const exchangeService = {
  getExchangeRates: () => {
    return api.get('/exchange_rates/');
  },
};

export default exchangeService;
