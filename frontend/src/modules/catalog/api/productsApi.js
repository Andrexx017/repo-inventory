import { getJson } from '../../../shared/apiClient';

export function getProducts() {
  return getJson('/api/products');
}
