import api from "./client";
import type { User, AuthTokens } from "../types";

export const login = (username: string, password: string) =>
  api.post<AuthTokens>("/auth/login/", { username, password });

export const getMe = () => api.get<User>("/auth/me/");

export const getUsers = () => api.get<User[]>("/auth/users/");

export const createUser = (data: {
  username: string;
  full_name: string;
  email: string;
  role: string;
  password: string;
}) => api.post<User>("/auth/users/", data);

export const updateUser = (
  id: number,
  data: { full_name?: string; email?: string; role?: string; is_active?: boolean }
) => api.patch<User>(`/auth/users/${id}/`, data);

export const deleteUser = (id: number) => api.delete(`/auth/users/${id}/`);
