import { getJson } from '../../../shared/apiClient';

export function getRoles() {
  return getJson('/api/roles');
}
