import { getJson, postJson, putJson } from '../../../shared/apiClient';

export function getUsers() {
  return getJson('/api/users');
}

export function createUser(user) {
  return postJson('/api/users', user);
}

export function updateUser(id, user) {
  return putJson(`/api/users/${id}`, user);
}
