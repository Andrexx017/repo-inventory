import { getJson, postJson, putJson } from '../../../shared/apiClient';

export function getTransfers(branchId, { sortBy, activeOnly, statuses, from, to, page = 1, pageSize = 25 } = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (sortBy) params.set('sortBy', sortBy);
  if (activeOnly) params.set('activeOnly', 'true');
  if (statuses) params.set('statuses', statuses.join(','));
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return getJson(`/api/transfers/${branchId}?${params}`);
}

export function getTransfersKpiSummary(branchId) {
  return getJson(`/api/transfers/${branchId}/kpi-summary`);
}

export function getTransferById(branchId, id) {
  return getJson(`/api/transfers/${branchId}/${id}`);
}

export function createTransfer(destinationBranchId, transfer) {
  return postJson(`/api/transfers/${destinationBranchId}`, transfer);
}

export function approveTransfer(destinationBranchId, id) {
  return postJson(`/api/transfers/${destinationBranchId}/${id}/approve`, {});
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
