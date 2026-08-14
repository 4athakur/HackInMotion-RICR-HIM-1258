import axios from 'axios';
import { useAuth } from '../context/AuthContext.tsx';
import { useEffect, useState } from 'react';

const api = axios.create({
  baseURL: '/api'
});

export const useApi = () => {
  const { token } = useAuth();

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }, [token]);

  return api;
};