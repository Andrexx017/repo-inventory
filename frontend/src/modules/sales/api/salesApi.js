import { getJson, postJson } from '../../../shared/apiClient';

export function getSales(branchId) {
  return getJson(`/api/sales/${branchId}`);
}

export function createSale(branchId, sale) {
  return postJson(`/api/sales/${branchId}`, sale);
}
