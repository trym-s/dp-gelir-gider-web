import axios from 'axios';

export const api = axios.create({
  baseURL: '/api', // Vite proxy'si bunu http://localhost:5000/api adresine yönlendirecek
  headers: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
});
