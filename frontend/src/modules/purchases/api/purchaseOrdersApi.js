import { getJson, postJson } from '../../../shared/apiClient';

export function getPurchaseOrders(branchId, { supplierId, from, to, page = 1, pageSize = 25 } = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (supplierId) params.set('supplierId', supplierId);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return getJson(`/api/purchase-orders/${branchId}?${params}`);
}

export function getPurchaseOrdersKpiSummary(branchId) {
  return getJson(`/api/purchase-orders/${branchId}/kpi-summary`);
}

export function createPurchaseOrder(branchId, order) {
  return postJson(`/api/purchase-orders/${branchId}`, order);
}

export function cancelPurchaseOrder(branchId, id) {
  return postJson(`/api/purchase-orders/${branchId}/${id}/cancel`, {});
}

export function createPurchaseReceipt(branchId, id, receipt) {
  return postJson(`/api/purchase-orders/${branchId}/${id}/receipts`, receipt);
}

export function getPurchaseReceipts(branchId, id) {
  return getJson(`/api/purchase-orders/${branchId}/${id}/receipts`);
}
