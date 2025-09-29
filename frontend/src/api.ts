import axios from 'axios';
import { Entry, CreateEntryRequest, EntryResponse, UserResponse } from './types';

const api = axios.create({
  baseURL: process.env.NODE_ENV === 'development' ? 'http://localhost:3001/api' : '/api',
  timeout: 10000,
});

export const entryAPI = {
  create: async (data: CreateEntryRequest): Promise<EntryResponse> => {
    const response = await api.post<EntryResponse>('/entries', data);
    return response.data;
  },

  getAll: async (): Promise<Entry[]> => {
    const response = await api.get<Entry[]>('/entries');
    return response.data;
  },

  getRanking: async (): Promise<Entry[]> => {
    const response = await api.get<Entry[]>('/ranking');
    return response.data;
  },
};

export const userAPI = {
  create: async (name: string): Promise<UserResponse> => {
    const response = await api.post<UserResponse>('/users', { name });
    return response.data;
  },

  get: async (id: string): Promise<UserResponse> => {
    const response = await api.get<UserResponse>(`/users/${id}`);
    return response.data;
  },
};