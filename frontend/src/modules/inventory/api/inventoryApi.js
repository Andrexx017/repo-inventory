import { getJson, postJson, putJson } from '../../../shared/apiClient';

export function getInventoryByBranch(branchId) {
  return getJson(`/api/inventory/${branchId}`);
}

export function getInventoryPaged(branchId, { search, categoryId, status, page = 1, pageSize = 25 } = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (search) params.set('search', search);
  if (categoryId) params.set('categoryId', categoryId);
  if (status) params.set('status', status);
  return getJson(`/api/inventory/${branchId}/paged?${params}`);
}

export function getMovements(branchId, { productId, from, to, page = 1, pageSize = 25 } = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (productId) params.set('productId', productId);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return getJson(`/api/inventory/${branchId}/movements?${params}`);
}

export function registerIncoming(branchId, movement) {
  return postJson(`/api/inventory/${branchId}/movements`, movement);
}

export function registerOutgoing(branchId, movement) {
  return postJson(`/api/inventory/${branchId}/movements/outgoing`, movement);
}

export function setThresholds(branchId, productId, thresholds) {
  return putJson(`/api/inventory/${branchId}/items/${productId}/thresholds`, thresholds);
}

export function getAlerts(branchId) {
  return getJson(`/api/inventory/${branchId}/alerts`);
}

export function resolveAlert(branchId, alertId) {
  return putJson(`/api/inventory/${branchId}/alerts/${alertId}/resolve`, {});
}
