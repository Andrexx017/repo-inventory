import { getJson } from '../../../shared/apiClient';

export function getPriceLists() {
  return getJson('/api/price-lists');
}
