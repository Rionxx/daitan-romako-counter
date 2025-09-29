export interface Entry {
  id: number;
  text: string;
  count: number;
  createdAt: string;
  updatedAt: string;
  userId?: string;
  userName?: string;
}

export interface User {
  id: string;
  name: string;
  createdAt: string;
}

export interface CreateEntryRequest {
  text: string;
  userId?: string;
  userName?: string;
}

export interface EntryResponse {
  success: boolean;
  message: string;
  entry?: Entry;
}

export interface UserResponse {
  success: boolean;
  message: string;
  user?: User;
}