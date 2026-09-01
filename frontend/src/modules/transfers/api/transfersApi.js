import { getJson, postJson, putJson } from '../../../shared/apiClient';

export function getTransfers(branchId, { sortBy, activeOnly } = {}) {
  const params = new URLSearchParams();
  if (sortBy) params.set('sortBy', sortBy);
  if (activeOnly) params.set('activeOnly', 'true');
  const query = params.toString() ? `?${params.toString()}` : '';
  return getJson(`/api/transfers/${branchId}${query}`);
}

export function getTransferById(branchId, id) {
  return getJson(`/api/transfers/${branchId}/${id}`);
}

export function createTransfer(destinationBranchId, transfer) {
  return postJson(`/api/transfers/${destinationBranchId}`, transfer);
}

export function prepareTransfer(originBranchId, id, prepare) {
  return putJson(`/api/transfers/${originBranchId}/${id}/prepare`, prepare);
}

export function shipTransfer(originBranchId, id, ship) {
  return putJson(`/api/transfers/${originBranchId}/${id}/ship`, ship);
}

export function receiveTransfer(destinationBranchId, id, receive) {
  return putJson(`/api/transfers/${destinationBranchId}/${id}/receive`, receive);
}

export function getBranchComplianceReport(branchId) {
  return getJson(`/api/transfers/reports/compliance/${branchId}`);
}

export function getGlobalComplianceReport() {
  return getJson('/api/transfers/reports/compliance');
}
