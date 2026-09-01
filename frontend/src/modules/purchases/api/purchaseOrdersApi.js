import { getJson, postJson } from '../../../shared/apiClient';

export function getPurchaseOrders(branchId, supplierId) {
  const query = supplierId ? `?supplierId=${supplierId}` : '';
  return getJson(`/api/purchase-orders/${branchId}${query}`);
}

export function createPurchaseOrder(branchId, order) {
  return postJson(`/api/purchase-orders/${branchId}`, order);
}

export function approvePurchaseOrder(branchId, id) {
  return postJson(`/api/purchase-orders/${branchId}/${id}/approve`, {});
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
