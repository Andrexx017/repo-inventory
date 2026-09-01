import { getJson } from '../../../shared/apiClient';

export function getSuppliers() {
  return getJson('/api/suppliers');
}
