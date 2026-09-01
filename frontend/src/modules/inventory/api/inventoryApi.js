import { getJson, postJson, putJson } from '../../../shared/apiClient';

export function getInventoryByBranch(branchId) {
  return getJson(`/api/inventory/${branchId}`);
}

export function getMovements(branchId) {
  return getJson(`/api/inventory/${branchId}/movements`);
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
