import { getJson, postJson } from '../../../shared/apiClient';

export function getSales(branchId, { from, to, page = 1, pageSize = 25 } = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return getJson(`/api/sales/${branchId}?${params}`);
}

export function getSalesKpiSummary(branchId) {
  return getJson(`/api/sales/${branchId}/kpi-summary`);
}

export function createSale(branchId, sale) {
  return postJson(`/api/sales/${branchId}`, sale);
}
