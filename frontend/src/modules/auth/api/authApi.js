import { postJson } from '../../../shared/apiClient';

export function login(email, password) {
  return postJson('/api/auth/login', { email, password });
}

export function forgotPassword(email) {
  return postJson('/api/auth/forgot-password', { email });
}

export function resetPassword(token, newPassword) {
  return postJson('/api/auth/reset-password', { token, newPassword });
}
