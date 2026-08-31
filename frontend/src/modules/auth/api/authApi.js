import { postJson } from '../../../shared/apiClient';

export function login(email, password) {
  return postJson('/api/auth/login', { email, password });
}
