import { getJson, postJson, putJson } from '../../../shared/apiClient';

export function getBranches() {
  return getJson('/api/branches');
}

export function createBranch(branch) {
  return postJson('/api/branches', branch);
}

export function updateBranch(id, branch) {
  return putJson(`/api/branches/${id}`, branch);
}
