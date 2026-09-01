import { getJson } from '../../../shared/apiClient';

export function getSalesSummary(branchId) {
  return getJson(`/api/dashboard/${branchId}/sales-summary`);
}

export function getInventoryRotation(branchId) {
  return getJson(`/api/dashboard/${branchId}/inventory-rotation`);
}

export function getActiveTransfers(branchId) {
  return getJson(`/api/dashboard/${branchId}/active-transfers`);
}

export function getLowStockIndicators(branchId) {
  return getJson(`/api/dashboard/${branchId}/low-stock`);
}

// RF-33: sin branchId — comparativa de TODAS las sucursales, solo general_admin
// (el backend la restringe con [Authorize(Roles = GeneralAdmin)], no SameBranch).
export function getBranchComparison() {
  return getJson('/api/dashboard/branch-comparison');
}
