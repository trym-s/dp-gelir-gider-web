import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:5000/api', // Flask backend’in URL’si
});
